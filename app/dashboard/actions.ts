"use server";

import { 
  getPushChannels, 
  savePushChannels, 
  addPushChannel, 
  updatePushChannel, 
  deletePushChannel,
  getThemePushConfig,
  saveThemePushConfig,
  getAllThemePushConfigs,
  getSettings,
  getRSSSources,
  PushChannel,
  ThemePushConfig
} from "@/lib/redis";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";
import { inngest } from "@/inngest/client";

/**
 * 获取当前用户 ID
 */
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");
  
  if (!authToken) return null;
  
  const user = getCurrentUserFromCookie(`auth_token=${authToken.value}`);
  return user?.userId || null;
}

/**
 * 获取推送渠道列表
 */
export async function fetchPushChannels() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    const channels = await getPushChannels(userId);
    return { success: true, channels };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 添加推送渠道
 */
export async function createPushChannel(channel: Omit<PushChannel, 'id' | 'createdAt'>) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    const newChannel: PushChannel = {
      ...channel,
      id: `channel_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
      enabled: channel.enabled !== false,
    };
    
    await addPushChannel(userId, newChannel);
    return { success: true, channel: newChannel };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 更新推送渠道
 */
export async function updatePushChannelById(channelId: string, updates: Partial<PushChannel>) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    await updatePushChannel(userId, channelId, updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 删除推送渠道
 */
export async function removePushChannel(channelId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    await deletePushChannel(userId, channelId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取订阅的推送渠道配置
 */
export async function fetchThemePushConfig(themeId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    const config = await getThemePushConfig(userId, themeId);
    return { success: true, config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 保存订阅的推送渠道配置
 */
export async function saveThemePushChannelConfig(config: ThemePushConfig) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    await saveThemePushConfig(userId, config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取所有订阅的推送渠道配置
 */
export async function fetchAllThemePushConfigs() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }
    
    const configs = await getAllThemePushConfigs(userId);
    return { success: true, configs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 测试推送：立即触发一次推送，推送到指定的渠道
 */
export async function testPushChannel(themeId: string, channelId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "未登录" };
    }

    // 使用 inngest 发送测试推送事件
    await inngest.send({
      name: "digest/test-push",
      data: { 
        userId,
        themeId,
        channelId,
      },
    });

    return { success: true, message: "测试推送已触发，请稍候查看推送结果" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
