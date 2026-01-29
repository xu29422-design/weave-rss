"use server";

import { inngest } from "@/inngest/client";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Send feedback and config info to admin bot
 */
export async function pushToAdminBot(type: 'config_update' | 'feedback', content: any) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(`auth_token=${authToken?.value}`);
    const username = user?.username || "unknown";

    const adminWebhook = "https://365.kdocs.cn/woa/api/v1/webhook/send?key=113a89749298fba10dcae6b7cb60db09";
    
    const title = type === 'config_update' ? "Config Updated" : "Feedback Received";
    const emoji = type === 'config_update' ? "UPDATE" : "FEEDBACK";

    const markdown = `## ${emoji} ${title}
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

    return { success: true };
  } catch (e) {
    console.error("Admin Bot push failed", e);
    return { success: false };
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
      
      stats.push({
        userId,
        settings,
        rssSources: rssSources || [],
      });
    }

    return { success: true, data: stats };
  } catch (e) {
    console.error("Get stats failed", e);
    return { success: false, error: "Failed to fetch data" };
  }
}
