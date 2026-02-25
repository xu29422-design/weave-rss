import { inngest } from "../client";
import { getSettings, getRSSSources, savePushLog, saveSettings, getPushChannels, getAllThemePushConfigs, getThemePushConfig, PushChannel, setDigestRunStatus } from "@/lib/redis";
import { fetchNewItems } from "@/lib/rss-utils";
import { analyzeItem, writeCategorySection, generateTLDR, shortenContent, filterTopItems } from "@/lib/ai-service";
import { getAllActiveUsers } from "@/lib/auth";
import { pushDigestToKdocs, getFirstDBSheetId } from "@/lib/kdocs-api";
import { createWPSDBSheetRecord } from "@/lib/wps-dbsheet-api";

const CATEGORY_MAP: Record<string, string> = {
  'Product': '📱 竞品动态',
  'AI Tech': '🔥 行业热点',
  'Market': '📊 市场动向',
  'Coding': '💻 技术实战',
  'Other': '🔍 其它资讯'
};

/** 单批最多条目数，超过则拆成两批分别喂 AI 并推送两次（上/下） */
const ITEMS_PER_BATCH = 40;
/** 预筛选上限，最多保留两批的量 */
const FILTER_TOP_LIMIT = 80;
/** 单步内最多分析条数，避免 FUNCTION_INVOCATION_TIMEOUT */
const ANALYZE_CHUNK_SIZE = 10;

/**
 * 智能延迟函数：智谱需要更长的间隔
 */
async function smartDelay(settings: any) {
  const delay = settings.aiProvider === 'openai' ? 300 : 100; // 智谱 300ms，Gemini 100ms
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 调度器：每小时触发，检查哪些用户设置了当前小时推送
 */
export const dailyScheduler = inngest.createFunction(
  { id: "daily-scheduler", name: "每日简报调度器" },
  { cron: "0 * * * *" },  // 每小时执行一次 (0分触发)
  async ({ step }) => {
    const userIds = await step.run("get-all-users", async () => {
      return await getAllActiveUsers();
    });

    if (userIds.length === 0) {
      return { status: "no_users" };
    }

    const now = new Date();
    const currentHour = now.getHours().toString();
    const currentDay = now.getDay(); // 0-6, 0 是周日
    
    console.log(`📢 开始调度 ${userIds.length} 个用户的简报生成任务，当前时间: ${currentHour}:00, 星期: ${currentDay}`);

    let dispatchedCount = 0;
    for (const userId of userIds) {
      const settings = await step.run(`get-settings-${userId}`, async () => {
        return await getSettings(userId);
      });

      // 如果用户没设时间（默认 8 点）或者 设定的时间等于当前小时
      const targetHour = settings?.pushTime || "8";
      const targetDays = settings?.pushDays || [1, 2, 3, 4, 5]; // 默认工作日
      
      if (targetHour === currentHour && targetDays.includes(currentDay)) {
        await step.sendEvent(`trigger-digest-${userId}`, {
          name: "digest/generate",
          data: { userId },
        });
        dispatchedCount++;
        console.log(`✅ 已为用户 ${userId} 发送任务事件 (目标时间: ${targetHour}, 目标日期: ${targetDays})`);
      }
    }

    return { status: "dispatched", dispatchedCount, currentHour };
  }
);

/**
 * 工作器：处理单个用户的简报生成和推送
 */
export const digestWorker = inngest.createFunction(
  { id: "digest-worker", name: "简报生成工作器" },
  { event: "digest/generate" },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    const cardRssUrls = (event.data.rssUrls as string[] | undefined)?.filter(Boolean);

    try {
      await setDigestRunStatus(userId, { status: "running", progress: 0, message: "正在准备…" });
      console.log(`🔄 开始处理用户 ${userId} 的简报...${cardRssUrls?.length ? ` (仅本卡片 ${cardRssUrls.length} 个源)` : ""}`);

      const { settings, rssSources, useSuperSub } = await step.run("get-config", async () => {
        const s = await getSettings(userId);
        const r = cardRssUrls?.length ? cardRssUrls : await getRSSSources(userId);
        const useSuperSub = !cardRssUrls?.length; // 仅当「全部源」时启用超级订阅
        return { settings: s, rssSources: r, useSuperSub };
      });

      if (!settings || rssSources.length === 0) {
        console.log(`⚠️ 用户 ${userId} 配置不完整，跳过`);
        await setDigestRunStatus(userId, { status: "failed", progress: 0, message: "配置不完整", finishedAt: new Date().toISOString() });
        return { status: "skipped", reason: "Missing config" };
      }

      const newItems = await step.run("fetch-and-dedupe", async () => {
        await setDigestRunStatus(userId, { status: "running", progress: 10, message: "RSS 抓取中" });
        const superKeyword = useSuperSub ? settings?.superSubKeyword : undefined;
        const items = await fetchNewItems(userId, rssSources, superKeyword);
        await setDigestRunStatus(userId, { status: "running", progress: 20, message: "RSS 抓取完成" });
        return items;
      });

      if (newItems.length === 0) {
        await setDigestRunStatus(userId, { status: "success", progress: 100, message: "暂无新内容", finishedAt: new Date().toISOString() });
        return { status: "completed", reason: "No new items" };
      }

    // AI 预筛选：条目多时多选一些，超过 ITEMS_PER_BATCH 则拆成两批
    const filterLimit = Math.min(newItems.length, FILTER_TOP_LIMIT);
    const filteredItems = await step.run("pre-filter-items", async () => {
      return await filterTopItems(newItems, settings!, filterLimit);
    });

    const batches = filteredItems.length <= ITEMS_PER_BATCH
      ? [filteredItems]
      : [
          filteredItems.slice(0, ITEMS_PER_BATCH),
          filteredItems.slice(ITEMS_PER_BATCH, FILTER_TOP_LIMIT),
        ];
    if (batches.length > 1) {
      console.log(`📦 当日内容较多，拆成 ${batches.length} 批处理并推送（上/下）`);
    }

    // 每批分别：AI 分析（拆成多步，每步最多 ANALYZE_CHUNK_SIZE 条，避免单步超时）
    const analyzedBatches: any[][] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const parts: any[][] = [];
      for (let start = 0; start < batch.length; start += ANALYZE_CHUNK_SIZE) {
        const chunk = batch.slice(start, start + ANALYZE_CHUNK_SIZE);
        const partIndex = Math.floor(start / ANALYZE_CHUNK_SIZE);
        const analyzedChunk = await step.run(`analyze-batch-${i}-part-${partIndex}`, async () => {
          await setDigestRunStatus(userId, { status: "running", progress: 28 + i * 8 + partIndex * 2, message: "AI 分析中" });
          const results = [];
          for (const item of chunk) {
            const result = await analyzeItem(item, settings!);
            results.push(result);
            await smartDelay(settings!);
          }
          return results;
        });
        parts.push(analyzedChunk);
      }
      await setDigestRunStatus(userId, { status: "running", progress: 38 + i * 12, message: "AI 分析完成" });
      analyzedBatches.push(parts.flat());
    }

    // 每批分别：TLDR 与分类综述拆成独立 step，避免单步过长
    const batchResults: { tldr: string; sections: { category: string; content: string }[]; highQualityItems: any[] }[] = [];
    for (let i = 0; i < analyzedBatches.length; i++) {
      const highQualityItems = analyzedBatches[i];
      const tldr = await step.run(`generate-tldr-batch-${i}`, async () => {
        await setDigestRunStatus(userId, { status: "running", progress: 52 + i * 6, message: "正在生成简报…" });
        if (highQualityItems.length === 0) return "🌟 **今日焦点**\n\n本批暂无高价值行业动态。";
        return (await generateTLDR(highQualityItems.map((j) => j.summary).join("\n"), settings!)) ||
          "🌟 **今日焦点**\n\n已抓取 " + highQualityItems.length + " 篇资讯。";
      });
      const categories = Array.from(new Set(highQualityItems.map((j) => j.category)));
      const sections: { category: string; content: string }[] = [];
      for (let c = 0; c < categories.length; c++) {
        const cat = categories[c];
        const catContent = await step.run(`generate-section-batch-${i}-cat-${c}`, async () => {
          const catItems = highQualityItems.filter((j) => j.category === cat);
          const content = await writeCategorySection(CATEGORY_MAP[cat] || cat, catItems, settings!);
          await smartDelay(settings!);
          return { category: CATEGORY_MAP[cat] || cat, content };
        });
        sections.push(catContent);
      }
      await setDigestRunStatus(userId, { status: "running", progress: 68 + i * 4, message: "简报内容已就绪，正在准备推送…" });
      batchResults.push({ tldr, sections, highQualityItems });
    }
    await setDigestRunStatus(userId, { status: "running", progress: 75, message: "正在组装与推送…" });

    const finalReport = await step.run("assemble-and-send", async () => {
      await setDigestRunStatus(userId, { status: "running", progress: 90, message: "内容推送中" });
      console.log("=== 开始组装简报 ===");

      const MAX_LENGTH = 4800;
      const MAX_RETRIES = 2;
      const pushResults: any = { channels: {} };
      const allReportContents: string[] = [];
      const allHighQualityItems: any[] = [];

      const channels = await getPushChannels(userId);
      const themeConfigs = await getAllThemePushConfigs(userId);
      const subscribedThemes = settings!.subscribedThemes || [];
      const channelsToPush = new Map<string, { channel: PushChannel; isPrimary: boolean }>();

      for (const themeId of subscribedThemes) {
        const themeConfig = themeConfigs[themeId];
        if (themeConfig) {
          const primaryChannel = channels.find((c) => c.id === themeConfig.primaryChannelId);
          if (primaryChannel && primaryChannel.enabled !== false) {
            channelsToPush.set(primaryChannel.id, { channel: primaryChannel, isPrimary: true });
          }
          if (themeConfig.secondaryChannelIds) {
            for (const channelId of themeConfig.secondaryChannelIds) {
              const ch = channels.find((c) => c.id === channelId);
              if (ch && ch.enabled !== false) channelsToPush.set(ch.id, { channel: ch, isPrimary: false });
            }
          }
        }
      }
      if (channelsToPush.size === 0 && settings!.webhookUrl) {
        channelsToPush.set("legacy-webhook", {
          channel: {
            id: "legacy-webhook",
            type: "webhook",
            name: "默认机器人",
            webhookUrl: settings!.webhookUrl,
            enabled: true,
          } as PushChannel,
          isPrimary: true,
        });
      }

      // 按批组装并推送（一批一条消息；两批则推送「今日简报（上）」「今日简报（下）」）
      for (let partIndex = 0; partIndex < batchResults.length; partIndex++) {
        const { tldr, sections, highQualityItems } = batchResults[partIndex];
        const partTitle = batchResults.length > 1 ? (partIndex === 0 ? "今日简报（上）" : "今日简报（下）") : "AI 行业简报";

        let lines: string[] = ["## " + partTitle, "", (tldr || "").trim(), ""];
        sections.forEach((s, idx) => {
          if (s?.content?.trim()) {
            lines.push(`### ${idx + 1}. ${s.category}`);
            lines.push("");
            lines.push(s.content.trim());
            lines.push("");
          }
        });
        lines.push("---", "", "> 本报告由 Weave 编织生成");
        let reportContent = lines.join("\n");

        let retryCount = 0;
        while (reportContent.length > MAX_LENGTH && retryCount < MAX_RETRIES) {
          const shortened = await shortenContent(reportContent, settings!);
          if (shortened && shortened.length < reportContent.length) reportContent = shortened;
          retryCount++;
        }
        if (reportContent.length > 5000) {
          reportContent = reportContent.substring(0, 4900) + "\n\n...(内容过长已截断)";
        }
        allReportContents.push(reportContent);
        allHighQualityItems.push(...highQualityItems);

        for (const [channelId, { channel, isPrimary }] of Array.from(channelsToPush.entries())) {
        try {
          if (channel.type === 'webhook' && channel.webhookUrl) {
            // 推送到 Webhook
            console.log(`=== 推送到 ${channel.name} (${isPrimary ? '主渠道' : '辅助渠道'}) ===`);
            
            const payload = {
              msgtype: "markdown",
              markdown: {
                text: reportContent
              }
            };
            
            const response = await fetch(channel.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const responseText = await response.text();
            let result: any;
            try {
              result = JSON.parse(responseText);
            } catch (e) {
              result = { raw: responseText };
            }
            const httpOk = response.status === 200 || response.ok;
            const bodyOk = result && typeof result.errcode === "number" ? result.errcode === 0 : true;
            if (httpOk && bodyOk) {
              console.log(`✅ 推送到 ${channel.name} 成功！`);
              pushResults.channels[channelId] = { success: true, type: 'webhook', name: channel.name, response: result };
            } else {
              if (httpOk && !bodyOk) console.error(`❌ 推送到 ${channel.name} 失败（接口返回 errcode）:`, result);
              else console.error(`❌ 推送到 ${channel.name} 失败:`, result);
              pushResults.channels[channelId] = { success: false, type: 'webhook', name: channel.name, error: result };
            }
          } else if (channel.type === 'email' && channel.emailAddress) {
            // 推送到邮箱（TODO: 实现邮箱推送逻辑）
            console.log(`⚠️  邮箱推送功能待实现: ${channel.emailAddress}`);
            pushResults.channels[channelId] = { success: false, type: 'email', name: channel.name, error: '邮箱推送功能待实现' };
          } else if (channel.type === 'kdocs') {
            // 推送到轻维表
            console.log(`=== 推送到轻维表 ${channel.name} (${isPrimary ? '主渠道' : '辅助渠道'}) ===`);
            
            if (!channel.kdocsAppId || !channel.kdocsAppSecret || !channel.kdocsFileToken) {
              console.error(`❌ 轻维表 ${channel.name} 配置不完整`);
              pushResults.channels[channelId] = { success: false, type: 'kdocs', name: channel.name, error: '配置不完整' };
              continue;
            }

            let dbSheetId = channel.kdocsDBSheetId;
            if (!dbSheetId) {
              console.log("⚠️  DBSheet ID 为空，尝试自动获取...");
              const firstSheetId = await getFirstDBSheetId(
                channel.kdocsAppId,
                channel.kdocsAppSecret,
                channel.kdocsFileToken
              );
              if (firstSheetId) {
                dbSheetId = firstSheetId;
                console.log(`✅ 自动获取到 DBSheet ID: ${dbSheetId}`);
              } else {
                console.error("❌ 无法自动获取 DBSheet ID");
                pushResults.channels[channelId] = { success: false, type: 'kdocs', name: channel.name, error: 'DBSheet ID 未配置且无法自动获取' };
                continue;
              }
            }
            
            const today = new Date().toISOString().split('T')[0];
            const kdocsResult = await pushDigestToKdocs(
              channel.kdocsAppId,
              channel.kdocsAppSecret,
              channel.kdocsFileToken,
              dbSheetId,
              {
                date: today,
                tldr: tldr || '',
                categories: sections.map(s => ({ name: s.category, content: s.content })),
                totalItems: highQualityItems.length,
                reportContent: reportContent,
              }
            );

            if (kdocsResult.success) {
              console.log(`✅ 推送到轻维表 ${channel.name} 成功！记录ID: ${kdocsResult.recordId}`);
              pushResults.channels[channelId] = { success: true, type: 'kdocs', name: channel.name, recordId: kdocsResult.recordId };
            } else {
              console.error(`❌ 推送到轻维表 ${channel.name} 失败:`, kdocsResult.error);
              pushResults.channels[channelId] = { success: false, type: 'kdocs', name: channel.name, error: kdocsResult.error };
            }
          } else if (channel.type === 'wps-dbsheet') {
            // 推送到 WPS 多维表格
            console.log(`=== 推送到 WPS 多维表格 ${channel.name} (${isPrimary ? '主渠道' : '辅助渠道'}) ===`);
            
            if (!channel.wpsAppId || !channel.wpsAppSecret || !channel.wpsFileToken || !channel.wpsTableId) {
              console.error(`❌ WPS 多维表格 ${channel.name} 配置不完整`);
              pushResults.channels[channelId] = { success: false, type: 'wps-dbsheet', name: channel.name, error: '配置不完整' };
              continue;
            }

            // 将简报内容推送到 WPS 多维表格
            // 每条高质量内容作为一条记录
            const wpsResults = [];
            for (const item of highQualityItems) {
              try {
                const wpsResult = await createWPSDBSheetRecord(
                  channel.wpsAppId,
                  channel.wpsAppSecret,
                  channel.wpsFileToken,
                  channel.wpsTableId,
                  {
                    '标题': item.title || '无标题',
                    '内容': item.summary || '',
                    '摘要': item.summary || tldr || '',
                    '来源': item.link || '',
                    '分类': item.category || '未分类',
                    '质量分数': item.score || 0,
                    '发布时间': new Date().toISOString(),
                    '导入时间': new Date().toISOString(),
                  }
                );

                if (wpsResult.success) {
                  wpsResults.push({ success: true, recordId: wpsResult.recordId });
                } else {
                  wpsResults.push({ success: false, error: wpsResult.error });
                }
              } catch (error: any) {
                console.error(`❌ 推送单条记录到 WPS 多维表格失败:`, error);
                wpsResults.push({ success: false, error: error.message });
              }
            }

            const successCount = wpsResults.filter(r => r.success).length;
            if (successCount > 0) {
              console.log(`✅ 推送到 WPS 多维表格 ${channel.name} 成功！成功 ${successCount}/${highQualityItems.length} 条记录`);
              pushResults.channels[channelId] = { 
                success: true, 
                type: 'wps-dbsheet', 
                name: channel.name, 
                successCount,
                totalCount: highQualityItems.length
              };
            } else {
              console.error(`❌ 推送到 WPS 多维表格 ${channel.name} 失败: 所有记录推送失败`);
              pushResults.channels[channelId] = { 
                success: false, 
                type: 'wps-dbsheet', 
                name: channel.name, 
                error: '所有记录推送失败',
                results: wpsResults
              };
            }
          }
        } catch (error: any) {
          console.error(`❌ 推送到 ${channel.name} 异常:`, error);
          pushResults.channels[channelId] = { success: false, type: channel.type, name: channel.name, error: error.message };
        }
      }

      // 向后兼容：如果没有新配置，使用旧的推送逻辑
      if (channelsToPush.size === 0 && settings!.webhookUrl) {
        // 使用旧的全局 webhook 配置
        console.log("=== 使用全局 Webhook 配置（向后兼容）===");
        const payload = {
          msgtype: "markdown",
          markdown: {
            text: reportContent
          }
        };
        
        const response = await fetch(settings!.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        let result: any;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { raw: responseText };
        }
        const httpOk = response.status === 200 || response.ok;
        const bodyOk = result && typeof result.errcode === "number" ? result.errcode === 0 : true;
        if (httpOk && bodyOk) {
          console.log("✅ 简报发送到机器人成功！");
          pushResults.channels['legacy-webhook'] = { success: true, type: 'webhook', name: '默认机器人', response: result };
        } else {
          if (httpOk && !bodyOk) console.error("❌ 发送到机器人失败（接口返回 errcode）:", result);
          else console.error("❌ 发送到机器人失败:", result);
          pushResults.channels['legacy-webhook'] = { success: false, type: 'webhook', name: '默认机器人', error: result };
        }
      }

      }

      const channelResults = Object.values(pushResults.channels);
      const hasSuccess = channelResults.some((r: any) => r.success);
      await savePushLog(userId, {
        status: hasSuccess ? "success" : "failed",
        error: channelResults.some((r: any) => !r.success) ? JSON.stringify(pushResults) : undefined,
        digestData: {
          highQualityItems: allHighQualityItems.map((item) => ({
            title: item.title,
            summary: item.summary,
            link: item.link,
            category: item.category,
            score: item.score,
          })),
        },
        reportContent: allReportContents.join("\n\n---\n\n"),
        details: {
          themeCount: settings!.subscribedThemes?.length || 0,
          sourceCount: rssSources.length,
          channelCount: channelResults.length,
          successCount: channelResults.filter((r: any) => r.success).length,
          partCount: batchResults.length,
        },
      });

      await setDigestRunStatus(userId, {
        status: hasSuccess ? "success" : "failed",
        progress: 100,
        message: hasSuccess ? "简报生成完成" : "推送失败",
        finishedAt: new Date().toISOString(),
      });

      if (channelResults.length > 0) {
        return {
          status: hasSuccess ? "sent" : "partial_failed",
          partCount: batchResults.length,
          pushResults,
        };
      }
      return { status: "no_push_target" };
    });

    return finalReport;
    } catch (err: any) {
      await setDigestRunStatus(userId, {
        status: "failed",
        progress: 0,
        message: err?.message || "运行出错",
        finishedAt: new Date().toISOString(),
      });
      throw err;
    }
  }
);

/**
 * 测试推送：立即测试指定渠道的推送功能
 */
export const testPushWorker = inngest.createFunction(
  { id: "test-push-worker", name: "测试推送工作器" },
  { event: "digest/test-push" },
  async ({ event, step }) => {
    const { userId, themeId, channelId } = event.data as { userId: string; themeId: string; channelId: string };
    
    console.log(`🧪 开始测试推送: userId=${userId}, themeId=${themeId}, channelId=${channelId}`);

    // 获取推送渠道
    const channels = await step.run("get-channels", async () => {
      return await getPushChannels(userId);
    });

    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.enabled === false) {
      return { success: false, error: "推送渠道不存在或已禁用" };
    }

    // 生成测试消息
    const testMessage = `# 🧪 推送测试消息

**测试时间**: ${new Date().toLocaleString('zh-CN')}
**主题**: ${themeId}
**推送渠道**: ${channel.name}

这是一条测试消息，用于验证推送渠道是否正常工作。

如果您收到这条消息，说明推送配置正确！✅`;

    const pushResult = await step.run("push-to-channel", async () => {
      try {
        if (channel.type === 'webhook' && channel.webhookUrl) {
          // 推送到 Webhook
          const payload = {
            msgtype: "markdown",
            markdown: {
              text: testMessage
            }
          };
          
          const response = await fetch(channel.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            result = { raw: responseText };
          }
          
          if (response.status === 200 || response.ok) {
            return { success: true, type: 'webhook', name: channel.name, response: result };
          } else {
            return { success: false, type: 'webhook', name: channel.name, error: result };
          }
        } else if (channel.type === 'email' && channel.emailAddress) {
          // 邮箱推送（待实现）
          return { success: false, type: 'email', name: channel.name, error: '邮箱推送功能待实现' };
        } else if (channel.type === 'kdocs') {
          // 推送到轻维表
          if (!channel.kdocsAppId || !channel.kdocsAppSecret || !channel.kdocsFileToken) {
            return { success: false, type: 'kdocs', name: channel.name, error: '配置不完整' };
          }

          let dbSheetId = channel.kdocsDBSheetId;
          if (!dbSheetId) {
            const firstSheetId = await getFirstDBSheetId(
              channel.kdocsAppId,
              channel.kdocsAppSecret,
              channel.kdocsFileToken
            );
            if (firstSheetId) {
              dbSheetId = firstSheetId;
            } else {
              return { success: false, type: 'kdocs', name: channel.name, error: 'DBSheet ID 未配置且无法自动获取' };
            }
          }
          
          const today = new Date().toISOString().split('T')[0];
          const kdocsResult = await pushDigestToKdocs(
            channel.kdocsAppId,
            channel.kdocsAppSecret,
            channel.kdocsFileToken,
            dbSheetId,
            {
              date: today,
              tldr: '测试推送',
              categories: [{ name: '测试', content: testMessage }],
              totalItems: 1,
              reportContent: testMessage,
            }
          );

          if (kdocsResult.success) {
            return { success: true, type: 'kdocs', name: channel.name, recordId: kdocsResult.recordId };
          } else {
            return { success: false, type: 'kdocs', name: channel.name, error: kdocsResult.error };
          }
        } else {
          return { success: false, error: '不支持的推送渠道类型' };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    return pushResult;
  }
);
