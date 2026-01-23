import { createClient } from "@vercel/kv";

export interface Settings {
  aiProvider: 'google' | 'openai';
  geminiApiKey: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  webhookUrl: string;
  // AI 提示词配置
  analystPrompt?: string;
  editorPrompt?: string;
  tldrPrompt?: string;
  pushTime?: string; // 定时推送时间 (0-23 的字符串)
  pushDays?: number[]; // 推送日期 (0-6，0代表周日)
  configCompleted?: boolean; // 标记配置是否已全部完成
  configMode?: 'simple' | 'pro'; // 配置模式
}

/**
 * 动态创建 KV 客户端，用于测试
 */
export function createKVClient(url?: string, token?: string) {
  const finalUrl = url || process.env.KV_REST_API_URL;
  const finalToken = token || process.env.KV_REST_API_TOKEN;

  if (!finalUrl || !finalToken) return null;

  try {
    return createClient({
      url: finalUrl,
      token: finalToken,
    });
  } catch (e) {
    return null;
  }
}

// 默认导出全局实例 (带容错)
const globalKv = createKVClient();

/**
 * 生成用户配置的 Redis Key
 */
function getUserSettingsKey(userId: string): string {
  return `user:${userId}:settings`;
}

function getUserRSSKey(userId: string): string {
  return `user:${userId}:rss_sources`;
}

/**
 * 获取用户配置（带用户隔离）
 */
export async function getSettings(userId: string): Promise<Settings | null> {
  if (!globalKv) return null;
  return await globalKv.get<Settings>(getUserSettingsKey(userId));
}

/**
 * 保存用户配置（带用户隔离）
 */
export async function saveSettings(userId: string, settings: Settings) {
  if (!globalKv) throw new Error("KV 客户端未初始化");
  await globalKv.set(getUserSettingsKey(userId), settings);
}

/**
 * 获取用户 RSS 源列表（带用户隔离）
 */
export async function getRSSSources(userId: string): Promise<string[]> {
  if (!globalKv) return [];
  const sources = await globalKv.get<string[]>(getUserRSSKey(userId));
  return sources || [];
}

/**
 * 保存用户 RSS 源列表（带用户隔离）
 */
export async function saveRSSSources(userId: string, sources: string[]) {
  if (!globalKv) throw new Error("KV 客户端未初始化");
  await globalKv.set(getUserRSSKey(userId), sources);
}
