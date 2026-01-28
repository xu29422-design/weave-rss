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
 */
export async function triggerDigest() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未登录");

  // 使用 inngest 客户端发送事件，这在服务端是安全的
  await inngest.send({
    name: "digest/generate",
    data: { userId },
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
  return { success: true };
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
