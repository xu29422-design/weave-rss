"use server";

import { inngest } from "@/inngest/client";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * 异步发送反馈和配置信息到管理员机器人
 */
export async function pushToAdminBot(type: 'config_update' | 'feedback', content: any) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(`auth_token=${authToken?.value}`);
    const username = user?.username || "未知用户";

    const adminWebhook = "https://365.kdocs.cn/woa/api/v1/webhook/send?key=113a89749298fba10dcae6b7cb60db09";
    
    const title = type === 'config_update' ? "新用户配置更新" : "收到用户反馈";
    const emoji = type === 'config_update' ? "🚀" : "💡";

    const markdown = `## ${emoji} ${title}
**用户**: ${username}
**时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
**内容**: 
\`\`\`json
${JSON.stringify(content, null, 2)}
\`\`\`
`;

    // 使用 fetch 异步发送
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
    console.error("Admin Bot 推送失败", e);
    return { success: false };
  }
}

/**
 * 获取所有用户的全局统计和订阅信息 (管理员专用)
 */
export async function getAllUserStats() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(`auth_token=${authToken?.value}`);
    
    // 管理员权限校验
    if (user?.username !== "1159370261@qq.com") {
      throw new Error("无权访问");
    }

    const { createClient } = await import("@vercel/kv");
    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    // 1. 获取所有以 user: 开头的 key
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
    console.error("获取用户统计失败", e);
    return { success: false, error: "获取数据失败" };
  }
}
