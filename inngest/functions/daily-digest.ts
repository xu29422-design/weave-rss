import { inngest } from "../client";
import { getSettings, getRSSSources, savePushLog, saveSettings, getPushChannels, getAllThemePushConfigs, getThemePushConfig, PushChannel, getUserCategoryWeights } from "@/lib/redis";

import { fetchNewItems } from "@/lib/rss-utils";
import { analyzeItem, generateConsolidatedReport, generateTLDR, shortenContent, filterTopItems } from "@/lib/ai-service";
import { getAllActiveUsers } from "@/lib/auth";
import { publishDigestToDoc } from "@/lib/wps-doc-service";
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
/** 单步内最多分析条数，2 条/步更稳，降低单次请求超时风险 */
const ANALYZE_CHUNK_SIZE = 2;

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
    const beijingTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
    const beijingDate = new Date(beijingTimeStr);
    const currentHour = beijingDate.getHours().toString();
    const currentDay = beijingDate.getDay(); // 0-6, 0 是周日
    
    console.log(`📢 开始调度 ${userIds.length} 个用户的简报生成任务，当前时间: ${currentHour}:00 (北京时间), 星期: ${currentDay}`);

    let dispatchedCount = 0;
    for (const userId of userIds) {
      const settings = await step.run(`get-settings-${userId}`, async () => {
        return await getSettings(userId);
      });

      // 如果用户没设时间（默认 8 点）或者 设定的时间等于当前小时
      const targetHour = String(settings?.pushTime ?? "8");
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
    const themeId = event.data.themeId as string | undefined;

    try {
      console.log(`🔄 开始处理用户 ${userId} 的简报...${cardRssUrls?.length ? ` (仅本卡片 ${cardRssUrls.length} 个源)` : ""}`);

      const { settings, rssSources, useSuperSub, categoryWeights } = await step.run("get-config", async () => {
        let s = await getSettings(userId);
        
        // 如果传入了 themeId，尝试匹配 Profile 并合并配置
        if (themeId && s?.themeConfigs && s.themeConfigs[themeId]) {
          const profile = s.themeConfigs[themeId];
          console.log(`🔍 匹配到主题卡片 [${themeId}] 的独立配置，将使用该配置的 AI 和 Webhook 设置`);
          s = {
            ...s,
            aiProvider: profile.aiProvider || s.aiProvider,
            geminiApiKey: profile.geminiApiKey || s.geminiApiKey,
            openaiApiKey: profile.openaiApiKey || s.openaiApiKey,
            openaiBaseUrl: profile.openaiBaseUrl || s.openaiBaseUrl,
            openaiModel: profile.openaiModel || s.openaiModel,
            analystPrompt: profile.analystPrompt || s.analystPrompt,
            editorPrompt: profile.editorPrompt || s.editorPrompt,
            tldrPrompt: profile.tldrPrompt || s.tldrPrompt,
            webhookUrl: profile.webhookUrl || s.webhookUrl,
          };
        }

        const r = cardRssUrls?.length ? cardRssUrls : await getRSSSources(userId);
        const useSuperSub = !cardRssUrls?.length; // 仅当「全部源」时启用超级订阅
        const categoryWeights = await getUserCategoryWeights(userId);
        return { settings: s, rssSources: r, useSuperSub, categoryWeights };
      });

      if (!settings || rssSources.length === 0) {
        console.log(`⚠️ 用户 ${userId} 配置不完整，跳过`);
        return { status: "skipped", reason: "Missing config" };
      }

      const FETCH_CHUNK_SIZE = 10;
      let newItems: any[] = [];
      const superKeyword = useSuperSub ? settings?.superSubKeyword : undefined;
      
      for (let i = 0; i < rssSources.length; i += FETCH_CHUNK_SIZE) {
        const chunkUrls = rssSources.slice(i, i + FETCH_CHUNK_SIZE);
        const partIndex = Math.floor(i / FETCH_CHUNK_SIZE);
        
        const chunkItems = await step.run(`fetch-batch-${partIndex}`, async () => {
          return await fetchNewItems(userId, chunkUrls, superKeyword);
        });
        
        newItems.push(...chunkItems);
      }

      if (newItems.length === 0) {
        return { status: "completed", reason: "No new items" };
      }

    // AI 预筛选：条目多时多选一些，超过 ITEMS_PER_BATCH 则拆成两批
    const filterLimit = Math.min(newItems.length, FILTER_TOP_LIMIT);
    const filteredItems = await step.run("pre-filter-items", async () => {
      return await filterTopItems(newItems, settings!, filterLimit, categoryWeights);
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
      analyzedBatches.push(parts.flat());
    }

      // 分批进行 TLDR 和聚合报告生成，避免这两步也因为内容过多导致单步超时
      const batchResults: { tldr: string; sections: { category: string; content: string }[]; markdownReport: string; highQualityItems: any[] }[] = [];
      for (let i = 0; i < analyzedBatches.length; i++) {
        const highQualityItems = analyzedBatches[i];
        
        // 提取 summary 时控制长度，防止单次输入过长导致请求变慢
        const summaryText = highQualityItems.map((j) => j.summary).join("\n").substring(0, 15000); 
        
        const tldr = await step.run(`generate-tldr-batch-${i}`, async () => {
          if (highQualityItems.length === 0) return "🌟 **今日焦点**\n\n本批暂无高价值行业动态。";
          return (await generateTLDR(summaryText, settings!)) ||
            "🌟 **今日焦点**\n\n已抓取 " + highQualityItems.length + " 篇资讯。";
        });
        
        // 如果批次内项目很多，也可以考虑分段处理，目前 ITEMS_PER_BATCH 最大 40，一次发给聚合报告一般还是可以承受的
        const { sections, markdownReport } = await step.run(`generate-consolidated-batch-${i}`, async () => {
          if (highQualityItems.length === 0) return { sections: [] as { category: string; content: string }[], markdownReport: "" };
          
          const itemsForReport = highQualityItems.map((j) => ({ 
            title: j.title, 
            summary: j.summary ? j.summary.substring(0, 500) : "", 
            link: j.link, 
            category: j.category 
          }));
          
          return generateConsolidatedReport(itemsForReport, settings!);
        });
        batchResults.push({ tldr, sections: sections || [], markdownReport: markdownReport || "", highQualityItems });
      }
    // Step 1：仅组装内容并写入 KV（不推送），缩短单次请求耗时，多维表可立即拉取
    const assembleResult = await step.run("assemble-and-save", async () => {
      const allHighQualityItems: any[] = [];
      const allSections: any[] = [];
      const allMarkdownReports: string[] = [];
      
      batchResults.forEach((b: any) => {
        if (b.highQualityItems) allHighQualityItems.push(...b.highQualityItems);
        if (b.sections && Array.isArray(b.sections)) {
          allSections.push(...b.sections);
        }
        if (b.markdownReport) allMarkdownReports.push(b.markdownReport);
      });

      // 生成全局 TLDR (今日评述)
      const allSummaries = allHighQualityItems.map(i => i.summary).join("\n\n");
      const globalTldr = await generateTLDR(allSummaries, settings!);

      const digestDataForLog = {
        highQualityItems: allHighQualityItems.map((item) => ({
          title: item.title,
          summary: item.summary,
          link: item.link,
          category: item.category,
          score: item.score,
        })),
        sections: allSections, // 保存为 JSON 数组供 H5 消费
      };

      const logId = await savePushLog(userId, {
        status: "success",
        digestData: digestDataForLog,
        reportContent: globalTldr, // 使用全局 TLDR 作为 reportContent
        details: {
          themeCount: settings!.subscribedThemes?.length || 0,
          sourceCount: rssSources.length,
          partCount: batchResults.length,
          pushPending: true,
          totalArticles: newItems.length,
          filteredNoise: newItems.length - allHighQualityItems.length,
          insightCount: allSections.length,
        },
      });

      return {
        logId,
        tldr: globalTldr,
        totalArticles: newItems.length,
        filteredNoise: newItems.length - allHighQualityItems.length,
        sourceCount: rssSources.length,
        allHighQualityItems: digestDataForLog.highQualityItems,
        allSections,
        consolidatedReport: allMarkdownReports.join("\n\n"),
        batchResultsLength: batchResults.length,
      };
    });

    // Step 2：将完整简报发布为金山智能文档，获取分享链接
    const wpsDocUrl = await step.run("publish-to-wps-doc", async () => {
      try {
        const allItems = assembleResult.allHighQualityItems || [];
        const now = new Date();
        const beijingTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
        const beijingDate = new Date(beijingTimeStr);
        const today = `${beijingDate.getFullYear()}-${String(beijingDate.getMonth() + 1).padStart(2, "0")}-${String(beijingDate.getDate()).padStart(2, "0")}`;

        // Part 1: AI 聚合报告（有态度的段落式叙述）
        const reportSection = (assembleResult.consolidatedReport || "").trim();

        // Part 2: 完整资讯列表（按分类，带摘要和链接）
        const grouped: Record<string, any[]> = {};
        allItems.forEach((item: any) => {
          const rawCat = item.category || 'Other';
          const cat = CATEGORY_MAP[rawCat] || rawCat;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
        });

        let itemListSection = '';
        for (const [category, items] of Object.entries(grouped)) {
          itemListSection += `\n### ${category}\n`;
          itemListSection += items.map((item: any) =>
            `- **${item.title}**${item.summary ? ' — ' + item.summary : ''} [原文链接](${item.link})`
          ).join('\n') + '\n';
        }

        const fullMarkdown = [
          `## 今日焦点`,
          (assembleResult.tldr || "").trim(),
          ``,
          ...(reportSection ? [`## AI 深度解读`, reportSection, ``] : []),
          `## 全部资讯列表`,
          itemListSection.trim(),
          ``,
          `---`,
          `由 Weave 自动生成 · ${today}`,
        ].join('\n');

        const docTitle = `Weave 每日简报 - ${today}`;
        const url = await publishDigestToDoc(docTitle, fullMarkdown);
        return url;
      } catch (e) {
        console.warn("[WPS] publish-to-wps-doc failed, will fallback to H5:", e);
        return null;
      }
    });

    // Step 3：仅推送（读上一步返回内容），单步只做网络请求，降低超时风险
    const finalReport = await step.run("push-to-channels", async () => {
      const { batchResultsLength, logId } = assembleResult;
      const pushResults: any = { channels: {} };

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

      const h5Url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/digest/${logId}`;
      const readMoreUrl = wpsDocUrl || h5Url;

      // 卡片内容：使用 AI 聚合报告（有态度、有观点的段落式叙述）
      let reportBody = (assembleResult.consolidatedReport || "").trim();
      const MAX_REPORT_LENGTH = 1500;
      if (reportBody.length > MAX_REPORT_LENGTH) {
        const truncated = reportBody.substring(0, MAX_REPORT_LENGTH);
        const lastNewline = truncated.lastIndexOf('\n');
        reportBody = (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) + '\n\n... 更多精彩内容请点击下方链接查看';
      }

      const shortReportContent = `🌟 **Weave 今日情报**\n\n**📊 抓取数据**\n- 📡 扫描源：${assembleResult.sourceCount || 0} 个 | 📝 发现：${assembleResult.totalArticles || 0} 篇 | 🛡️ 过滤噪音：${assembleResult.filteredNoise || 0} 篇\n\n${(assembleResult.tldr || "").trim()}\n\n**📰 今日速览**\n${reportBody}\n\n👉 [点击阅读完整简报](${readMoreUrl})`;

      for (const [channelId, { channel, isPrimary }] of Array.from(channelsToPush.entries())) {
        const reportContent = shortReportContent;
        try {
          if (channel.type === 'webhook' && channel.webhookUrl) {
          // 推送到 Webhook
          console.log(`=== 推送到 ${channel.name} (${isPrimary ? '主渠道' : '辅助渠道'}) ===`);
            
            // WPS 开放平台卡片格式（与官方示例一致）：config + i18n_items；header、elements 在 i18n_items[].value 内。若卡片报 InvalidArgument 会降级为 Markdown 推送。
            const payload = {
              msgtype: "card",
              card: {
                config: {
                  shared_card: true,
                  processing_state: "unprocessed",
                },
                i18n_items: [
                  {
                    key: "zh-CN",
                    value: {
                      header: {
                        title: { tag: "text", text: { type: "plain", content: "每日简报" } },
                      },
                      elements: [
                        { tag: "markdown", content: reportContent },
                        { tag: "hr" },
                        {
                          tag: "action",
                          layout: "bisected",
                          actions: [
                            {
                              button: {
                                tag: "button",
                                text: { content: "🤖 一键提炼核心观点", type: "plain" },
                                style: "normal",
                                key: "action_ai_summarize",
                              },
                            },
                            {
                              button: {
                                tag: "button",
                                text: { content: "📝 提取待办事项", type: "plain" },
                                style: "normal",
                                key: "action_ai_todo",
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
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
            let httpOk = response.status === 200 || response.ok;
            let bodyOk = result && typeof result.errcode === "number" ? result.errcode === 0 : true;
            if (httpOk && bodyOk) {
              console.log(`✅ 推送到 ${channel.name} 成功！`);
              pushResults.channels[channelId] = { success: true, type: 'webhook', name: channel.name, response: result };
            } else {
              console.error(`❌ 卡片推送到 ${channel.name} 失败，尝试降级为 Markdown 推送...`);
              const markdownPayload = { msgtype: "markdown", markdown: { text: reportContent } };
              const fallbackRes = await fetch(channel.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(markdownPayload),
              });
              const fallbackText = await fallbackRes.text();
              let fallbackResult: any;
              try {
                fallbackResult = JSON.parse(fallbackText);
              } catch (e) {
                fallbackResult = { raw: fallbackText };
              }
              const fallbackOk = (fallbackRes.status === 200 || fallbackRes.ok) && (!fallbackResult.errcode || fallbackResult.errcode === 0);
              if (fallbackOk) {
                console.log(`✅ 推送到 ${channel.name} 成功（已降级为 Markdown）`);
                pushResults.channels[channelId] = { success: true, type: 'webhook', name: channel.name, response: fallbackResult, fallback: "markdown" };
              } else {
                console.error(`❌ 推送到 ${channel.name} 失败 | status=${response.status} | body=${responseText.slice(0, 500)}`);
                pushResults.channels[channelId] = { success: false, type: 'webhook', name: channel.name, error: result };
              }
            }
          } else if (channel.type === 'email' && channel.emailAddress) {
            // 推送到邮箱（TODO: 实现邮箱推送逻辑）
            console.log(`⚠️  邮箱推送功能待实现: ${channel.emailAddress}`);
            pushResults.channels[channelId] = { success: false, type: 'email', name: channel.name, error: '邮箱推送功能待实现' };
          } else if (channel.type === 'kdocs') {
            // 金山轻维表：不再服务端主动推送，由用户侧自行拉取
            console.log(`ℹ️ 金山轻维表 ${channel.name}：已取消服务端主动推送，由用户侧自行拉取`);
            pushResults.channels[channelId] = { success: true, type: 'kdocs', name: channel.name, skipped: true, reason: '已取消服务端主动推送' };
          } else if (channel.type === 'wps-dbsheet') {
            // WPS 多维表：不在推送时写入。用户在多维表侧通过 API（如 /api/digest/latest）主动拉取已有简报数据。
            console.log(`ℹ️ WPS 多维表格 ${channel.name}：由用户通过 API 主动拉取数据，此处不写入`);
            pushResults.channels[channelId] = { success: true, type: 'wps-dbsheet', name: channel.name, skipped: true, reason: '由多维表侧 API 主动拉取' };
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
        const reportContent = shortReportContent;
        // WPS 开放平台卡片格式（与官方示例一致）
        const payload = {
          msgtype: "card",
          card: {
            config: {
              shared_card: true,
              processing_state: "unprocessed",
            },
            i18n_items: [
              {
                key: "zh-CN",
                value: {
                  header: {
                    title: { tag: "text", text: { type: "plain", content: "每日简报" } },
                  },
                  elements: [
                    { tag: "markdown", content: reportContent },
                    { tag: "hr" },
                    {
                      tag: "action",
                      layout: "bisected",
                      actions: [
                        {
                          button: {
                            tag: "button",
                            text: { content: "🤖 一键提炼核心观点", type: "plain" },
                            style: "normal",
                            key: "action_ai_summarize",
                          },
                        },
                        {
                          button: {
                            tag: "button",
                            text: { content: "📝 提取待办事项", type: "plain" },
                            style: "normal",
                            key: "action_ai_todo",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
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
        let httpOk = response.status === 200 || response.ok;
        let bodyOk = result && typeof result.errcode === "number" ? result.errcode === 0 : true;
        if (httpOk && bodyOk) {
          console.log("✅ 简报发送到机器人成功！");
          pushResults.channels['legacy-webhook'] = { success: true, type: 'webhook', name: '默认机器人', response: result };
        } else {
          console.error("❌ 卡片发送失败，尝试降级为 Markdown 推送...");
          const markdownPayload = { msgtype: "markdown", markdown: { text: reportContent } };
          const fallbackRes = await fetch(settings!.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(markdownPayload),
          });
          const fallbackText = await fallbackRes.text();
          let fallbackResult: any;
          try {
            fallbackResult = JSON.parse(fallbackText);
          } catch (e) {
            fallbackResult = { raw: fallbackText };
          }
          const fallbackOk = (fallbackRes.status === 200 || fallbackRes.ok) && (!fallbackResult.errcode || fallbackResult.errcode === 0);
          if (fallbackOk) {
            console.log("✅ 简报发送到机器人成功（已降级为 Markdown）");
            pushResults.channels['legacy-webhook'] = { success: true, type: 'webhook', name: '默认机器人', response: fallbackResult, fallback: "markdown" };
          } else {
            console.error("❌ 发送到机器人失败 | status=", response.status, "| body=", responseText.slice(0, 500));
            pushResults.channels['legacy-webhook'] = { success: false, type: 'webhook', name: '默认机器人', error: result };
          }
        }
      }

      const channelResults = Object.values(pushResults.channels);
      const hasSuccess = channelResults.some((r: any) => r.success);

      if (channelResults.length > 0) {
        return { status: hasSuccess ? "sent" : "partial_failed", partCount: batchResultsLength, pushResults };
      }
      return { status: "no_push_target" };
    });

    return finalReport;
    } catch (err: any) {
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
    const testMessage = `# 🧪 推送测试消息\n\n**测试时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n**主题**: ${themeId}\n**推送渠道**: ${channel.name}\n\n这是一条测试消息，用于验证推送渠道是否正常工作。\n\n如果您收到这条消息，说明推送配置正确！✅`;

    const pushResult = await step.run("push-to-channel", async () => {
      try {
        if (channel.type === 'webhook' && channel.webhookUrl) {
          // 推送到 Webhook
          // WPS 开放平台卡片格式（与官方示例一致）
          const payload = {
            msgtype: "card",
            card: {
              config: {
                shared_card: true,
                processing_state: "unprocessed",
              },
              i18n_items: [
                {
                  key: "zh-CN",
                  value: {
                    header: {
                      title: { tag: "text", text: { type: "plain", content: "推送测试" } },
                    },
                    elements: [
                      { tag: "markdown", content: testMessage },
                      { tag: "hr" },
                      {
                        tag: "action",
                        layout: "bisected",
                        actions: [
                          {
                            button: {
                              tag: "button",
                              text: { content: "🤖 一键提炼核心观点", type: "plain" },
                              style: "normal",
                              key: "action_ai_summarize",
                            },
                          },
                          {
                            button: {
                              tag: "button",
                              text: { content: "📝 提取待办事项", type: "plain" },
                              style: "normal",
                              key: "action_ai_todo",
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
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
          // 金山轻维表：已取消服务端主动推送
          return { success: true, type: 'kdocs', name: channel.name, skipped: true, reason: '已取消服务端主动推送' };
        } else if (channel.type === 'wps-dbsheet') {
          return { success: true, type: 'wps-dbsheet', name: channel.name, skipped: true, reason: '由多维表侧 API 主动拉取' };
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