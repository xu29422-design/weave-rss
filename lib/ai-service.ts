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
