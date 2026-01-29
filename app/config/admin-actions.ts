"use server";

import { inngest } from "@/inngest/client";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Save user feedback/like to Redis and notify admin
 */
export async function pushToAdminBot(type: 'config_update' | 'feedback', content: any) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(`auth_token=${authToken?.value}`);
    const username = user?.username || "unknown";

    // 1. Save to Redis for Admin Dashboard
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const feedbackLog = {
      id: `fb_${Date.now()}`,
      username,
      type,
      content,
      timestamp: new Date().toISOString()
    };

    await kv.lpush('admin:feedbacks', JSON.stringify(feedbackLog));
    await kv.ltrim('admin:feedbacks', 0, 99); // Keep last 100 feedbacks

    // 2. Try to notify via Webhook (Optional, don't throw if fails)
    try {
      const adminWebhook = "https://365.kdocs.cn/woa/api/v1/webhook/send?key=113a89749298fba10dcae6b7cb60db09";
      const title = type === 'config_update' ? "Config Updated" : "Feedback Received";
      
      const markdown = `## ${title}
**User**: ${username}
**Time**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
**Content**: 
\`\`\`json
${JSON.stringify(content, null, 2)}
\`\`\`
`;

      await fetch(adminWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgtype: "markdown",
          markdown: { text: markdown }
        })
      });
    } catch (webhookError) {
      console.warn("Webhook notification failed, but feedback was saved to Redis");
    }

    return { success: true };
  } catch (e) {
    console.error("Feedback submission failed", e);
    // Return success true anyway to avoid user-facing error for non-critical feature
    return { success: true, warning: "Saved locally only" };
  }
}

/**
 * Get all user stats (Admin only)
 */
export async function getAllUserStats() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(`auth_token=${authToken?.value}`);
    
    if (user?.username !== "1159370261@qq.com") {
      throw new Error("Unauthorized");
    }

    const { createClient } = await import("@vercel/kv");
    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const keys = await kv.keys("user:*:settings");
    
    const stats = [];
    for (const key of keys) {
      const parts = key.split(":");
      const userId = parts[1];
      const settings = await kv.get(key);
      const rssSources = await kv.get(`user:${userId}:rss_sources`);
      
      // Get push logs
      const pushLogsKey = `user:${userId}:push_logs`;
      const pushLogsRaw = await kv.lrange(pushLogsKey, 0, 9); 
      const pushLogs = pushLogsRaw.map((l: any) => typeof l === 'string' ? JSON.parse(l) : l);
      
      stats.push({
        userId,
        settings,
        rssSources: rssSources || [],
        pushLogs: pushLogs || [],
      });
    }

    // Get all feedbacks
    const feedbacksRaw = await kv.lrange('admin:feedbacks', 0, 49);
    const feedbacks = feedbacksRaw.map((f: any) => typeof f === 'string' ? JSON.parse(f) : f);

    return { success: true, data: stats, feedbacks: feedbacks || [] };
  } catch (e) {
    console.error("Get stats failed", e);
    return { success: false, error: "Failed to fetch data" };
  }
}
