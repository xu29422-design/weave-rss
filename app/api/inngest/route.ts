import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { dailyScheduler, digestWorker } from "@/inngest/functions/daily-digest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyScheduler,   // 调度器：每天触发
    digestWorker,     // 工作器：处理单个用户
  ],
});
