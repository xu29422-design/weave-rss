import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { dailyScheduler, digestWorker } from "@/inngest/functions/daily-digest";

// Inngest 单次请求可能长时间轮询/执行，需提高 Vercel 函数时长上限。
// Hobby 计划最高 300s，Pro 最高 800s；超时仍会报 504 FUNCTION_INVOCATION_TIMEOUT。
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyScheduler,   // 调度器：每天触发
    digestWorker,     // 工作器：处理单个用户
  ],
});
