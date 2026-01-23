import { inngest } from "../client";
import { getSettings, getRSSSources } from "@/lib/redis";
import { fetchNewItems } from "@/lib/rss-utils";
import { analyzeItem, writeCategorySection, generateTLDR } from "@/lib/ai-service";
import { getAllActiveUsers } from "@/lib/auth";

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
      return await fetchNewItems(userId, rssSources);
    });

    if (newItems.length === 0) return { status: "completed", reason: "No new items" };

    // AI 分析（串行 + 延迟）
    const analyzedItems = await step.run("analyze-items", async () => {
      const results = [];
      for (const item of newItems) {
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
      lines.push("> 本报告由 Weave RSS 编织生成");
      
      const reportContent = lines.join("\n");
      
      console.log("简报总长度:", reportContent.length, "字符");
      console.log("前300字预览:\n", reportContent.substring(0, 300));

      if (settings!.webhookUrl) {
        const payload = {
          msgtype: "markdown",
          markdown: {
            text: reportContent  // 关键：WPS 要求字段名是 text
          }
        };
        
        const response = await fetch(settings!.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log("=== WPS 响应 ===");
        console.log("状态码:", response.status);
        console.log("响应:", responseText);
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { raw: responseText };
        }
        
        if (response.status === 200 || response.ok) {
          console.log("✅ 简报发送成功！");
          return { status: "sent", length: reportContent.length, wps_response: result };
        } else {
          console.error("❌ 发送失败:", result);
          return { status: "failed", error: result };
        }
      }
      return { status: "no_webhook" };
    });

    return finalReport;
  }
);
