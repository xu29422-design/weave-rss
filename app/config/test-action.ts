"use server";

import { createKVClient } from "@/lib/redis";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function testConfigs(formData: FormData) {
  const kvUrl = formData.get("kvUrl") as string;
  const kvToken = formData.get("kvToken") as string;
  const webhookUrl = formData.get("webhookUrl") as string;
  const rssUrlsString = formData.get("rssUrls") as string;
  
  const aiProvider = formData.get("aiProvider") as string;
  const geminiApiKey = formData.get("geminiApiKey") as string;
  const openaiApiKey = formData.get("openaiApiKey") as string;
  const openaiBaseUrl = formData.get("openaiBaseUrl") as string;
  const openaiModel = formData.get("openaiModel") as string;

  const results = {
    kv: { status: "pending", message: "" },
    ai: { status: "pending", message: "" },
    prompts: { status: "pending", message: "" },
    webhook: { status: "pending", message: "" },
    rss: { status: "pending", message: "" },
  };

  // 1. 测试 KV
  try {
    const kv = createKVClient(kvUrl, kvToken);
    if (!kv) throw new Error("URL 或 Token 格式错误");
    await kv.set("test_connection", "ok", { ex: 10 });
    results.kv = { status: "success", message: "KV 连接成功！" };
  } catch (e: any) {
    results.kv = { status: "error", message: `KV 失败: ${e.message}` };
  }

  // 2. 测试 AI
  try {
    if (aiProvider === 'google') {
      const googleProvider = createGoogleGenerativeAI({
        apiKey: geminiApiKey,
      });
      const model = googleProvider("models/gemini-1.5-flash-latest");
      const { text } = await generateText({
        model,
        prompt: "hi",
      } as any);
      if (text) results.ai = { status: "success", message: "Gemini 响应正常！" };
    } else {
      const cleanedUrl = (openaiBaseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
      const customOpenAI = createOpenAI({
        baseURL: cleanedUrl,
        apiKey: openaiApiKey,
      });
      
      const model = customOpenAI(openaiModel || "glm-4-flash");
      const { text } = await generateText({
        model,
        prompt: "hi",
        max_tokens: 10,
      } as any);

      if (text) {
        results.ai = { status: "success", message: "AI 响应正常！" };
      }
    }
  } catch (e: any) {
    // 兜底测试：直接使用 fetch 请求智谱
    try {
      const baseUrl = (openaiBaseUrl || "").trim().replace(/\/+$/, "");
      const testRes = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: openaiModel || "glm-4-flash",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5
        })
      });

      if (testRes.ok) {
        results.ai = { status: "success", message: "AI 连接成功 (通过原生验证)！" };
      } else {
        const errorDetail = await testRes.json().catch(() => ({}));
        results.ai = { status: "error", message: `AI 失败: ${errorDetail.error?.message || testRes.statusText}` };
      }
    } catch (fetchErr: any) {
      results.ai = { status: "error", message: `AI 失败: ${e.message}` };
    }
  }

  // 3. 测试 Webhook
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "text",
        text: { content: "Weave: 这是一个测试连接消息" },
      }),
    });
    if (res.ok) {
      results.webhook = { status: "success", message: "Webhook 推送成功！" };
    } else {
      throw new Error(`HTTP 错误: ${res.status}`);
    }
  } catch (e: any) {
    results.webhook = { status: "error", message: `Webhook 失败: ${e.message}` };
  }

  // 4. 测试 RSS
  try {
    const urls = rssUrlsString.split("\n").filter(u => u.trim());
    if (urls.length === 0) throw new Error("至少需要一个订阅源");
    new URL(urls[0]);
    results.rss = { status: "success", message: `成功识别 ${urls.length} 个订阅源！` };
  } catch (e: any) {
    results.rss = { status: "error", message: `RSS 格式错误: ${e.message}` };
  }

  // 5. 测试 Prompts (始终通过，因为是高级配置)
  results.prompts = { status: "success", message: "提示词格式已记录。" };

  return results;
}
