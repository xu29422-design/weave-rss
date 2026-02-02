import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ANALYST_PROMPT, EDITOR_PROMPT, TLDR_PROMPT } from "./ai-prompts";
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
    // 如果是速率限制 (429) 或服务器错误 (5xx)，则重试
    const isRateLimit = error?.status === 429 || error?.message?.includes("429");
    const isServerError = error?.status >= 500 || error?.message?.includes("500");
    
    if (retries > 0 && (isRateLimit || isServerError)) {
      console.warn(`AI 请求失败，正在重试 (${retries} 次剩余)... 错误: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); // 指数退避
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
 */
export async function writeCategorySection(category: string, items: any[], settings: Settings) {
  const { model } = getAIModel(settings);
  const validItems = items.filter(i => i.score > 0 && i.summary !== "解析失败");
  
  if (validItems.length === 0) return "(数据包为空，没有内容)";

  let systemPrompt = settings.editorPrompt || EDITOR_PROMPT(category, validItems.length);
  // 如果是用户自定义提示词，手动替换占位符
  if (settings.editorPrompt) {
    systemPrompt = systemPrompt
      .replace(/\$\{category\}/g, category)
      .replace(/\$\{count\}/g, validItems.length.toString());
  }

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: validItems.map(i => `- ${i.title}: ${i.summary} (URL: ${i.link})`).join("\n"),
  } as any);
  return text;
}

/**
 * 生成全局 TL;DR
 */
export async function generateTLDR(allSummaries: string, settings: Settings) {
  if (!allSummaries || (allSummaries.includes("解析失败") && allSummaries.length < 20)) {
    return "🌟 今日焦点 今日资讯源中未发现高价值情报。";
  }

  const { model } = getAIModel(settings);
  const systemPrompt = settings.tldrPrompt || TLDR_PROMPT;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: allSummaries,
  } as any);
  return text;
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
