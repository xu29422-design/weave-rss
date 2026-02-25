import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ANALYST_PROMPT, EDITOR_PROMPT, TLDR_PROMPT, CONSOLIDATED_REPORT_PROMPT } from "./ai-prompts";
import { RawRSSItem } from "./rss-utils";
import { Settings } from "./redis";

/**
 * 通用的 AI 模型初始化函数
 */
function getAIModel(settings: Settings) {
  if (settings.aiProvider === 'google') {
    return {
      model: google("models/gemini-1.5-flash-latest"),
    };
  } else {
    const openai = createOpenAI({
      baseURL: settings.openaiBaseUrl?.trim().replace(/\/+$/, "") || "https://api.openai.com/v1",
      apiKey: settings.openaiApiKey,
    });
    return {
      model: openai.chat(settings.openaiModel || "glm-4-flash"),
    };
  }
}

/** 是否为内容安全/敏感内容类错误（不重试，直接降级） */
function isContentSafetyError(error: any): boolean {
  const msg = String(error?.message ?? error?.code ?? "");
  return /敏感|不安全|AI_APICallError|content.*policy|safety/i.test(msg);
}

/**
 * 带指数退避的重试包装器
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (isContentSafetyError(error)) {
      console.warn("AI 内容安全策略拦截，不重试:", error?.message);
      throw error;
    }
    const isRateLimit = error?.status === 429 || error?.message?.includes("429");
    const isServerError = error?.status >= 500 || error?.message?.includes("500");
    if (retries > 0 && (isRateLimit || isServerError)) {
      console.warn(`AI 请求失败，正在重试 (${retries} 次剩余)... 错误: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Analyst Agent: 分析单条新闻 (Map Phase)
 */
export async function analyzeItem(item: RawRSSItem, settings: Settings) {
  const { model } = getAIModel(settings);
  
  const systemPrompt = (settings.analystPrompt || ANALYST_PROMPT) + "\n\n请务必只返回标准的 JSON 对象。即使内容简短，也请基于标题进行合理推测和分类，给出 1-10 的评分。不要输出任何解释性文字，不要使用 Markdown 代码块标签。";

  try {
    const { text } = await withRetry(() => generateText({
      model,
      system: systemPrompt,
      prompt: `标题: ${item.title}\n内容: ${item.contentSnippet || "（内容为空）"}\n来源: ${item.sourceName}`,
    } as any));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedText = jsonMatch ? jsonMatch[0] : text;
    const result = JSON.parse(cleanedText);
    
    const hasValidContent = result.summary && result.summary.length > 3 && !result.summary.includes("内容不足");
    
    return { 
      title: result.title || item.title,
      summary: hasValidContent ? result.summary : item.title,
      category: result.category || "Other",
      score: hasValidContent ? (result.score || 3) : 3,
      reasoning: result.reasoning || "",
      link: item.link,
      isDeepAnalyzed: hasValidContent // 标记是否经过深度分析
    };
  } catch (e: any) {
    console.error("AI 结果解析失败或重试耗尽:", e.message);
    return {
      title: item.title,
      summary: item.title,
      category: "Other",
      score: 2, // 失败条目分值稍低
      reasoning: "AI 繁忙，已自动跳过深度分析",
      link: item.link,
      isDeepAnalyzed: false
    };
  }
}

/**
 * Editor Agent: 撰写分类长文
 * 若遇内容安全策略拦截则返回降级文案，不中断整次简报
 */
export async function writeCategorySection(category: string, items: any[], settings: Settings) {
  const { model } = getAIModel(settings);
  const validItems = items.filter(i => i.score > 0 && i.summary !== "解析失败");
  const fallback = `**${category}**\n\n本分类因内容策略未生成 AI 综述，以下为原文链接：\n\n${validItems.map(i => `- [${i.title}](${i.link})`).join("\n")}`;

  if (validItems.length === 0) return "(数据包为空，没有内容)";

  let systemPrompt = settings.editorPrompt || EDITOR_PROMPT(category, validItems.length);
  if (settings.editorPrompt) {
    systemPrompt = systemPrompt
      .replace(/\$\{category\}/g, category)
      .replace(/\$\{count\}/g, validItems.length.toString());
  }

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: validItems.map(i => `- ${i.title}: ${i.summary} (URL: ${i.link})`).join("\n"),
    } as any);
    return text;
  } catch (e: any) {
    if (isContentSafetyError(e)) {
      console.warn(`[writeCategorySection] 内容安全拦截，使用降级文案: ${category}`, e?.message);
      return fallback;
    }
    throw e;
  }
}

/**
 * 聚合报告：将整批资讯聚成 3～6 个主题段，每段有标题和展开内容，每条内容后附链接
 * 返回 sections 供简报组装使用（与原先按分类的 sections 结构一致）
 */
export async function generateConsolidatedReport(
  items: { title: string; summary: string; link: string; category?: string }[],
  settings: Settings
): Promise<{ sections: { category: string; content: string }[] }> {
  const validItems = items.filter((i) => i.link && (i.summary || i.title));
  if (validItems.length === 0) {
    return { sections: [] };
  }

  const { model } = getAIModel(settings);
  const inputList = validItems
    .map((i) => `- **${i.title}**：${i.summary || ""} 链接：${i.link}`)
    .join("\n");

  const fallbackSections = [
    {
      category: "今日动态",
      content: validItems
        .map((i) => `- **${i.title}** ${(i.summary || "").slice(0, 80)} [链接](${i.link})`)
        .join("\n"),
    },
  ];

  try {
    const { text } = await withRetry(() =>
      generateText({
        model,
        system: CONSOLIDATED_REPORT_PROMPT(validItems.length),
        prompt: inputList,
      } as any)
    );

    const raw = (text || "").trim();
    if (!raw) return { sections: fallbackSections };

    // 解析 ### 小标题 + 段落，拆成 sections
    const blocks = raw.split(/\n(?=###\s+)/).filter(Boolean);
    const sections: { category: string; content: string }[] = [];

    for (const block of blocks) {
      const firstLineEnd = block.indexOf("\n");
      let title = firstLineEnd >= 0 ? block.slice(0, firstLineEnd) : block;
      let content = firstLineEnd >= 0 ? block.slice(firstLineEnd + 1) : "";
      title = title.replace(/^###\s*/, "").trim();
      content = content.trim();
      if (title) sections.push({ category: title, content });
    }

    if (sections.length > 0) return { sections };
    return { sections: [{ category: "今日动态", content: raw }] };
  } catch (e: any) {
    if (isContentSafetyError(e)) {
      console.warn("[generateConsolidatedReport] 内容安全拦截，使用降级列表", e?.message);
      return { sections: fallbackSections };
    }
    throw e;
  }
}

/**
 * 生成全局 TL;DR
 * 若遇内容安全策略拦截则返回降级文案
 */
export async function generateTLDR(allSummaries: string, settings: Settings) {
  const defaultTldr = "🌟 **今日焦点**\n\n今日资讯源中未发现高价值情报，或摘要因内容策略未生成。";
  if (!allSummaries || (allSummaries.includes("解析失败") && allSummaries.length < 20)) {
    return defaultTldr;
  }

  const { model } = getAIModel(settings);
  const systemPrompt = settings.tldrPrompt || TLDR_PROMPT;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: allSummaries,
    } as any);
    return text;
  } catch (e: any) {
    if (isContentSafetyError(e)) {
      console.warn("[generateTLDR] 内容安全拦截，使用默认摘要", e?.message);
      return defaultTldr;
    }
    throw e;
  }
}

/**
 * 智能精简器：当内容超过 5000 字时调用
 */
export async function shortenContent(content: string, settings: Settings, targetLength = 4500) {
  const { model } = getAIModel(settings);
  
  const prompt = `
    你是一位资深新闻编辑。以下是一份每日行业简报，由于字数超过了机器人推送的限制（5000字），请在保持内容质量和 Markdown 格式不变的前提下，将其精简到 ${targetLength} 字以内。

    精简要求：
    1. 绝对不能删除“## AI 行业简报”标题和“🌟 今日焦点”部分。
    2. 缩短每条新闻的描述，保留核心事实，剔除冗余修饰。
    3. 必须保留所有原文中的 [链接](url) 格式，不能删除链接。
    4. 保持原有的分类标题（如 ### 1. 📱 竞品动态）。
    5. 如果字数依然超标，请优先合并相似新闻，或删除评分较低的新闻条目。

    当前内容：
    ${content}
  `;

  try {
    const { text } = await generateText({
      model,
      prompt,
    } as any);
    return text;
  } catch (e) {
    console.error("精简请求失败:", e);
    return content; // 失败则返回原内容
  }
}

/**
 * 廉价模型预筛选：从海量标题中选出最值得分析的条目，并进行语义去重
 */
export async function filterTopItems(items: any[], settings: Settings, limit = 20) {
  if (items.length <= limit) return items;

  // 使用指定的廉价模型和独立 API Key 进行预筛选，降低成本
  const cheapOpenAI = createOpenAI({
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: "c477d5942a774d55929744e67ab819a5.H7SL0nqrfdZUgOYP",
  });
  const model = cheapOpenAI.chat("glm-4-flash-250414");
  
  const prompt = `
    你是一位资深情报编辑。以下是从多个 RSS 源抓取到的 ${items.length} 条新闻标题。
    请根据新闻的重要性、时效性和行业关联度，选出最值得深度分析的 ${limit} 条新闻。
    
    筛选规则：
    1. 语义去重：对于同一个热点事件或高度重复的信息，请只保留一条最完整、最具代表性的标题。
    2. 质量优先：剔除软文、广告、无实质内容的短讯。
    ${settings.superSubKeyword ? `3. 关注重点：用户目前最关注的主题是“${settings.superSubKeyword}”，请务必优先保留相关内容。` : ''}

    待筛选列表：
    ${items.map((item, idx) => `[ID:${idx}] ${item.title}`).join("\n")}

    请直接返回选中的 ID 列表，用逗号分隔，不要输出任何其他文字。例如：1,3,5,12...
  `;

  try {
    const { text } = await generateText({
      model,
      prompt,
    } as any);
    
    const selectedIds = text.split(/[,，]/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const filtered = selectedIds.map(id => items[id]).filter(Boolean);
    
    console.log(`🎯 AI 预筛选与去重完成：${items.length} -> ${filtered.length} 篇`);
    return filtered.length > 0 ? filtered : items.slice(0, limit);
  } catch (e) {
    console.error("AI 预筛选失败:", e);
    return items.slice(0, limit);
  }
}
