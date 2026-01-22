"use server";

import { saveSettings, saveRSSSources, getSettings, getRSSSources, Settings } from "@/lib/redis";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
    return { authenticated: true, settings, rssSources };
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
