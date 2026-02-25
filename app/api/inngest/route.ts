import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { dailyScheduler, digestWorker } from "@/inngest/functions/daily-digest";

// 单步最长 60s（免费套餐上限），避免 digest 某一步触发 FUNCTION_INVOCATION_TIMEOUT（仅对 /api/inngest 生效）
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyScheduler,   // 调度器：每天触发
    digestWorker,     // 工作器：处理单个用户
  ],
});
