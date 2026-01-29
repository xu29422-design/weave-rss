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
  projectName?: string; // 订阅项目名称
  configCompleted?: boolean; // 标记配置是否已全部完成
  configMode?: 'simple' | 'pro'; // 配置模式
  subscribedThemes?: string[]; // 已订阅的主题ID列表
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

/**
 * 推送日志接口
 */
export interface PushLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  details?: {
    themeCount: number;
    sourceCount: number;
  };
}

/**
 * 保存推送日志 (保留最近 50 条)
 */
export async function savePushLog(userId: string, log: Omit<PushLog, 'id' | 'timestamp'>) {
  if (!globalKv) return;
  const key = `user:${userId}:push_logs`;
  const newLog: PushLog = {
    ...log,
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  
  // 使用 lpush 和 ltrim 保留最近 50 条记录
  await globalKv.lpush(key, JSON.stringify(newLog));
  await globalKv.ltrim(key, 0, 49);
}

/**
 * 获取用户最近的推送日志
 */
export async function getPushLogs(userId: string): Promise<PushLog[]> {
  if (!globalKv) return [];
  const key = `user:${userId}:push_logs`;
  const logs = await globalKv.lrange<string>(key, 0, -1);
  return logs.map(l => JSON.parse(l));
}
