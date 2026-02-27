"use server";

import { saveSettings, saveRSSSources, getSettings, getRSSSources, Settings } from "@/lib/redis";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { inngest } from "@/inngest/client";

/**
 * 获取当前用户 ID（从 Cookie）
 */
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");
  
  if (!authToken) return null;
  
  const user = getCurrentUserFromCookie(`auth_token=${authToken.value}`);
  return user?.userId || null;
}

/**
 * 手动触发一次简报生成任务
 * @param rssUrls 可选。若传入则仅使用这些 RSS 源（针对当前卡片）；不传则使用用户全部订阅源
 */
export async function triggerDigest(rssUrls?: string[], themeId?: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未登录");

  const payload: { userId: string; rssUrls?: string[]; themeId?: string } = { userId };
  if (rssUrls?.length) payload.rssUrls = rssUrls;
  if (themeId) payload.themeId = themeId;

  await inngest.send({
    name: "digest/generate",
    data: payload,
  });

  return { success: true };
}

/**
 * 获取当前已保存的所有配置
 */
export async function fetchCurrentConfig() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { authenticated: false, settings: null, rssSources: [] };
    }
    
    const settings = await getSettings(userId);
    const rssSources = await getRSSSources(userId);
    
    // 确保返回 pushDays 以供前端回显
    const processedSettings = settings ? {
      ...settings,
      pushDays: settings.pushDays || [1, 2, 3, 4, 5],
      configCompleted: settings.configCompleted || false,
      subscribedThemes: settings.subscribedThemes || []
    } : null;

    return { authenticated: true, settings: processedSettings, rssSources };
  } catch (e) {
    return { authenticated: false, settings: null, rssSources: [] };
  }
}

/**
 * 单独保存核心设置 (AI, Webhook)
 */
export async function persistSettings(settings: Settings) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("未登录");
  }
  
  await saveSettings(userId, settings);
  revalidatePath("/config");
  revalidatePath("/onboarding");
  return { success: true };
}

/**
 * 单独保存 RSS 列表
 */
export async function persistRSS(rssUrls: string[]) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("未登录");
  }
  
  await saveRSSSources(userId, rssUrls);
  revalidatePath("/config");
  revalidatePath("/onboarding");
  return { success: true };
}

/**
 * 向指定 Webhook URL 发送一条测试消息（与日报推送同格式）
 */
export async function testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl?.trim()) return { success: false, error: "请填写 Webhook 地址" };
  try {
    const payload = {
      msgtype: "markdown",
      markdown: {
        text: "**【Weave 测试消息】**\n\n这是一条来自 Weave 的测试推送，说明你的 Webhook 已配置成功。之后 RSS 分析结果将推送到此处。"
      }
    };
    const res = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "请求失败" };
  }
}

/**
 * 标记新手引导已完成
 */
export async function markOnboardingCompleted() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未登录");
  const settings = await getSettings(userId);
  if (settings) {
    await saveSettings(userId, { ...settings, onboardingCompleted: true });
  }
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

/**
 * 标记配置已完成
 */
export async function markConfigAsCompleted(completed: boolean = true) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未登录");

  const settings = await getSettings(userId);
  if (settings) {
    await saveSettings(userId, { ...settings, configCompleted: completed });
  }
  revalidatePath("/config");
  return { success: true };
}
