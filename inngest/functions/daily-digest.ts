import { inngest } from "../client";
import { getSettings, getRSSSources, savePushLog, saveSettings, getPushChannels, getAllThemePushConfigs, getThemePushConfig, PushChannel } from "@/lib/redis";
import { fetchNewItems } from "@/lib/rss-utils";
import { analyzeItem, writeCategorySection, generateTLDR, shortenContent, filterTopItems } from "@/lib/ai-service";
import { getAllActiveUsers } from "@/lib/auth";
import { pushDigestToKdocs, getFirstDBSheetId } from "@/lib/kdocs-api";

const CATEGORY_MAP: Record<string, string> = {
  'Product': '📱 竞品动态',
  'AI Tech': '🔥 行业热点',
  'Market': '📊 市场动向',
  'Coding': '💻 技术实战',
  'Other': '🔍 其它资讯'
};

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
    
    console.log(`🔄 开始处理用户 ${userId} 的简报...`);

    const { settings, rssSources } = await step.run("get-config", async () => {
      const s = await getSettings(userId);
      const r = await getRSSSources(userId);
      return { settings: s, rssSources: r };
    });

    if (!settings || rssSources.length === 0) {
      console.log(`⚠️ 用户 ${userId} 配置不完整，跳过`);
      return { status: "skipped", reason: "Missing config" };
    }

    const newItems = await step.run("fetch-and-dedupe", async () => {
      return await fetchNewItems(userId, rssSources, settings?.superSubKeyword);
    });

    if (newItems.length === 0) return { status: "completed", reason: "No new items" };

    // AI 预筛选：从海量标题中选出最值得分析的 20 条
    const filteredItems = await step.run("pre-filter-items", async () => {
      return await filterTopItems(newItems, settings!);
    });

    // AI 分析（串行 + 延迟）
    const analyzedItems = await step.run("analyze-items", async () => {
      const results = [];
      for (const item of filteredItems) {
        const result = await analyzeItem(item, settings!);
        results.push(result);
        console.log(`[AI 评分] ${result.score}分 - ${result.title.substring(0, 30)}...`);
        await smartDelay(settings!);
      }
      
      // 统计评分分布
      const scoreDistribution: Record<number, number> = {};
      results.forEach(r => {
        scoreDistribution[r.score] = (scoreDistribution[r.score] || 0) + 1;
      });
      console.log("=== 评分分布 ===", scoreDistribution);
      
      return results;
    });

    // 【临时】：移除评分过滤，让所有文章都通过，确保能收到推送
    const highQualityItems = analyzedItems; // 原本是: .filter(item => item.score >= 5)
    
    console.log(`✅ 总共 ${analyzedItems.length} 篇，临时取消评分过滤，全部保留`);
    
    const tldr = await step.run("generate-tldr", async () => {
      if (highQualityItems.length === 0) {
        return "🌟 **今日焦点**\n\n当前订阅源中暂无高价值（评分 >= 5）的行业动态。系统已成功运行，但未发现值得推送的内容。";
      }
      const allSummaries = highQualityItems.map(i => i.summary).join("\n");
      const res = await generateTLDR(allSummaries, settings!);
      return res || "🌟 **今日焦点**\n\nAI 摘要生成失败，但已抓取到 " + highQualityItems.length + " 篇高质量资讯。";
    });

    const categories = Array.from(new Set(highQualityItems.map(i => i.category)));
    
    // 【关键修复】：改为串行生成分类综述，避免并发超限
    const sections = await step.run("generate-sections", async () => {
      if (categories.length === 0) return [];
      
      const results = [];
      for (const cat of categories) {
        const catItems = highQualityItems.filter(i => i.category === cat);
        console.log(`正在生成分类 "${CATEGORY_MAP[cat] || cat}" 的综述...`);
        
        const content = await writeCategorySection(CATEGORY_MAP[cat] || cat, catItems, settings!);
        results.push({ category: CATEGORY_MAP[cat] || cat, content });
        
        // 每个分类之间增加延迟
        await smartDelay(settings!);
      }
      return results;
    });

    const finalReport = await step.run("assemble-and-send", async () => {
      console.log("=== 开始组装简报 ===");
      
      let lines: string[] = [];
      
      // 标题
      lines.push("## AI 行业简报");
      lines.push("");
      
      // TL;DR
      if (tldr && tldr.trim().length > 0) {
        lines.push(tldr.trim());
        lines.push("");
      }
      
      // 各分类内容（保留链接）
      if (sections.length > 0) {
        sections.forEach((s, idx) => {
          if (s && s.content && s.content.trim().length > 0) {
            lines.push(`### ${idx + 1}. ${s.category}`);
            lines.push("");
            lines.push(s.content.trim());
            lines.push("");
          }
        });
      }
      
      // 页脚
      lines.push("---");
      lines.push("");
      lines.push("> 本报告由 Weave 编织生成");
      
      let reportContent = lines.join("\n");
      
      // 【新增】：长度校验与 AI 自动精简逻辑
      const MAX_LENGTH = 4800; // 预留余量
      let retryCount = 0;
      const MAX_RETRIES = 2;

      while (reportContent.length > MAX_LENGTH && retryCount < MAX_RETRIES) {
        console.log(`⚠️ 内容超长 (${reportContent.length}字)，正在进行第 ${retryCount + 1} 次 AI 精简...`);
        const shortened = await shortenContent(reportContent, settings!);
        if (shortened && shortened.length < reportContent.length) {
          reportContent = shortened;
        } else {
          console.log("❌ AI 精简未能显著减少字数，跳过本次尝试");
        }
        retryCount++;
      }

      // 如果依然超长，进行硬截断（保底方案）
      if (reportContent.length > 5000) {
        console.log("🚨 AI 精简后依然超长，执行硬截断保底...");
        reportContent = reportContent.substring(0, 4900) + "\n\n...(内容过长已截断)";
      }
      
      console.log("最终简报长度:", reportContent.length, "字符");
      console.log("前300字预览:\n", reportContent.substring(0, 300));

      // 推送结果
      const pushResults: any = {
        channels: {},
      };

      // 获取推送渠道和订阅配置
      const channels = await getPushChannels(userId);
      const themeConfigs = await getAllThemePushConfigs(userId);
      const subscribedThemes = settings.subscribedThemes || [];

      // 收集需要推送的渠道（去重）
      const channelsToPush = new Map<string, { channel: PushChannel; isPrimary: boolean }>();

      // 遍历已订阅的主题，收集推送渠道
      for (const themeId of subscribedThemes) {
        const themeConfig = themeConfigs[themeId];
        
        if (themeConfig) {
          // 使用订阅的推送渠道配置
          const primaryChannel = channels.find(c => c.id === themeConfig.primaryChannelId);
          if (primaryChannel && primaryChannel.enabled !== false) {
            channelsToPush.set(primaryChannel.id, { channel: primaryChannel, isPrimary: true });
          }

          if (themeConfig.secondaryChannelIds) {
            for (const channelId of themeConfig.secondaryChannelIds) {
              const channel = channels.find(c => c.id === channelId);
              if (channel && channel.enabled !== false) {
                channelsToPush.set(channel.id, { channel, isPrimary: false });
              }
            }
          }
        }
      }

      // 如果没有订阅配置，使用全局配置（向后兼容）
      if (channelsToPush.size === 0) {
        // 使用旧的全局 webhook 配置
        if (settings!.webhookUrl) {
          channelsToPush.set('legacy-webhook', {
            channel: {
              id: 'legacy-webhook',
              type: 'webhook',
              name: '默认机器人',
              webhookUrl: settings!.webhookUrl,
              enabled: true,
            } as PushChannel,
            isPrimary: true,
          });
        }

        // 使用旧的全局轻维表配置
        if (settings!.enableKdocsPush && settings!.kdocsAppId && settings!.kdocsAppSecret && settings!.kdocsFileToken) {
          channelsToPush.set('legacy-kdocs', {
            channel: {
              id: 'legacy-kdocs',
              type: 'kdocs',
              name: '默认轻维表',
              kdocsAppId: settings!.kdocsAppId,
              kdocsAppSecret: settings!.kdocsAppSecret,
              kdocsFileToken: settings!.kdocsFileToken,
              kdocsDBSheetId: settings!.kdocsDBSheetId,
              enabled: true,
            } as PushChannel,
            isPrimary: false,
          });
        }
      }

      // 推送到所有收集到的渠道
      for (const [channelId, { channel, isPrimary }] of channelsToPush) {
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
            let result;
            try {
              result = JSON.parse(responseText);
            } catch (e) {
              result = { raw: responseText };
            }
            
            if (response.status === 200 || response.ok) {
              console.log(`✅ 推送到 ${channel.name} 成功！`);
              pushResults.channels[channelId] = { success: true, type: 'webhook', name: channel.name, response: result };
            } else {
              console.error(`❌ 推送到 ${channel.name} 失败:`, result);
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
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { raw: responseText };
        }
        
        if (response.status === 200 || response.ok) {
          console.log("✅ 简报发送到机器人成功！");
          pushResults.channels['legacy-webhook'] = { success: true, type: 'webhook', name: '默认机器人', response: result };
        } else {
          console.error("❌ 发送到机器人失败:", result);
          pushResults.channels['legacy-webhook'] = { success: false, type: 'webhook', name: '默认机器人', error: result };
        }
      }

      // 记录推送日志
      const channelResults = Object.values(pushResults.channels);
      const hasSuccess = channelResults.some((r: any) => r.success);
      const hasFailure = channelResults.some((r: any) => !r.success);
      
      await savePushLog(userId, {
        status: hasSuccess ? 'success' : 'failed',
        error: hasFailure ? JSON.stringify(pushResults) : undefined,
        details: {
          themeCount: settings.subscribedThemes?.length || 0,
          sourceCount: rssSources.length,
          channelCount: channelResults.length,
          successCount: channelResults.filter((r: any) => r.success).length,
        }
      });

      // 返回结果
      if (channelResults.length > 0) {
        return {
          status: hasSuccess ? "sent" : "partial_failed",
          length: reportContent.length,
          pushResults,
        };
      }
      
      return { status: "no_push_target" };
    });

    return finalReport;
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
