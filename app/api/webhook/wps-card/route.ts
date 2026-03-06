import { NextRequest, NextResponse } from "next/server";
import { getRandomSystemLLMConfig } from "@/lib/ai-service";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

/**
 * 通用的 AI 模型初始化函数 (这里可以考虑抽取到共享库，为了快速实现先放在这里或复用 ai-service)
 */
function getAIModel(settings: any) {
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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("WPS Card Callback Payload:", JSON.stringify(payload));

    const action = payload?.data?.content?.action;
    if (!action) {
      return NextResponse.json({ code: 400, msg: "Missing action in payload" });
    }

    // 抓取公共的 LLM 配置
    const llmConfig = await getRandomSystemLLMConfig();
    if (!llmConfig) {
      return NextResponse.json({
        code: 0,
        msg: "success",
        data: {
          type: "card",
          content: {
            card: {
              config: { enable_forward: true },
              i18n_items: {
                zh_CN: [
                  { tag: "markdown", content: "⚠️ **系统提示**\n\n当前系统未配置可用的大模型 API Key，无法执行该操作。" }
                ]
              }
            }
          }
        }
      });
    }

    let aiResult = "";
    const { model } = getAIModel(llmConfig);

    // 根据不同的 action 执行不同的 Prompt
    if (action === "action_ai_summarize") {
      const { text } = await generateText({
        model,
        system: "你是一个专业的资讯分析师。请提取这段文字中最核心的三个观点，要求非常简练，使用项目符号。",
        prompt: "请提炼今日推送简报的核心观点。", // 这里理想情况应该结合传入的上下文内容
      });
      aiResult = text;
    } else if (action === "action_ai_todo") {
      const { text } = await generateText({
        model,
        system: "你是一个得力的效率助手。请从提供的信息中，提取出值得团队或个人去跟进的行动项（To-Do）。如果没有明显的行动项，请提供 1-2 条思考建议。",
        prompt: "请根据今日资讯提取待办事项或行动建议。", 
      });
      aiResult = text;
    } else {
      aiResult = "未知的交互动作: " + action;
    }

    // 构建原位刷新的卡片响应
    return NextResponse.json({
      code: 0,
      msg: "success",
      data: {
        type: "card",
        content: {
          card: {
            config: { enable_forward: true },
            i18n_items: {
              zh_CN: [
                { tag: "markdown", content: `✨ **AI 智能处理结果**\n\n${aiResult}` },
                { tag: "hr" },
                { tag: "markdown", content: "> 💡 该结果由共享大模型生成，卡片已更新" }
              ]
            }
          }
        }
      }
    });

  } catch (error: any) {
    console.error("处理 WPS 卡片回调异常:", error);
    return NextResponse.json({ code: 500, msg: "Internal Server Error" });
  }
}
