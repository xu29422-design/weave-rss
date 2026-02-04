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
  superSubKeyword?: string; // 超级订阅关键词
  // 推送渠道配置（全局配置池）
  pushChannels?: PushChannel[]; // 推送渠道列表（机器人、邮箱、轻维表）
}

/**
 * 推送渠道类型
 */
export type PushChannelType = 'webhook' | 'email' | 'kdocs' | 'wps-dbsheet';

/**
 * 推送渠道配置
 */
export interface PushChannel {
  id: string; // 渠道唯一ID
  type: PushChannelType; // 渠道类型
  name: string; // 渠道名称（用户自定义）
  // Webhook 配置
  webhookUrl?: string; // Webhook URL（当 type 为 'webhook' 时）
  // 邮箱配置
  emailAddress?: string; // 邮箱地址（当 type 为 'email' 时）
  // 轻维表配置
  kdocsAppId?: string; // 金山文档 App ID（当 type 为 'kdocs' 时）
  kdocsAppSecret?: string; // 金山文档 App Secret
  kdocsFileToken?: string; // 轻维表文件 token
  kdocsDBSheetId?: string; // 轻维表数据表 ID
  // WPS 多维表格配置
  wpsAppId?: string; // WPS 应用 ID（当 type 为 'wps-dbsheet' 时）
  wpsAppSecret?: string; // WPS 应用密钥
  wpsFileToken?: string; // WPS 多维表文件 token
  wpsTableId?: string; // WPS 多维表数据表 ID
  // 通用配置
  enabled?: boolean; // 是否启用
  createdAt?: string; // 创建时间
}

/**
 * 订阅的推送渠道配置
 */
export interface ThemePushConfig {
  themeId: string; // 主题ID
  primaryChannelId: string; // 主推送渠道ID（必须）
  secondaryChannelIds?: string[]; // 辅助推送渠道ID列表（可选，如轻维表）
}

/**
 * 获取订阅的推送渠道配置
 */
export async function getThemePushConfig(userId: string, themeId: string): Promise<ThemePushConfig | null> {
  if (!globalKv) return null;
  const key = `user:${userId}:theme_push_config:${themeId}`;
  return await globalKv.get<ThemePushConfig>(key);
}

/**
 * 保存订阅的推送渠道配置
 */
export async function saveThemePushConfig(userId: string, config: ThemePushConfig) {
  if (!globalKv) throw new Error("KV 客户端未初始化");
  const key = `user:${userId}:theme_push_config:${config.themeId}`;
  await globalKv.set(key, config);
}

/**
 * 获取所有订阅的推送渠道配置
 */
export async function getAllThemePushConfigs(userId: string): Promise<Record<string, ThemePushConfig>> {
  if (!globalKv) return {};
  // 获取所有主题推送配置
  const keys = await globalKv.keys(`user:${userId}:theme_push_config:*`);
  const configs: Record<string, ThemePushConfig> = {};
  
  for (const key of keys) {
    const themeId = key.split(':').pop() || '';
    const config = await globalKv.get<ThemePushConfig>(key);
    if (config) {
      configs[themeId] = config;
    }
  }
  
  return configs;
}

/**
 * 获取用户的推送渠道列表
 */
export async function getPushChannels(userId: string): Promise<PushChannel[]> {
  if (!globalKv) return [];
  const settings = await getSettings(userId);
  return settings?.pushChannels || [];
}

/**
 * 保存推送渠道列表
 */
export async function savePushChannels(userId: string, channels: PushChannel[]) {
  if (!globalKv) throw new Error("KV 客户端未初始化");
  const settings = await getSettings(userId);
  if (settings) {
    await saveSettings(userId, { ...settings, pushChannels: channels });
  }
}

/**
 * 添加推送渠道
 */
export async function addPushChannel(userId: string, channel: PushChannel) {
  const channels = await getPushChannels(userId);
  channels.push(channel);
  await savePushChannels(userId, channels);
}

/**
 * 更新推送渠道
 */
export async function updatePushChannel(userId: string, channelId: string, updates: Partial<PushChannel>) {
  const channels = await getPushChannels(userId);
  const index = channels.findIndex(c => c.id === channelId);
  if (index >= 0) {
    channels[index] = { ...channels[index], ...updates };
    await savePushChannels(userId, channels);
  }
}

/**
 * 删除推送渠道
 */
export async function deletePushChannel(userId: string, channelId: string) {
  const channels = await getPushChannels(userId);
  const filtered = channels.filter(c => c.id !== channelId);
  await savePushChannels(userId, filtered);
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
  digestData?: {
    highQualityItems: Array<{
      title?: string;
      summary?: string;
      link?: string;
      category?: string;
      score?: number;
    }>;
  };
  reportContent?: string;
  details?: {
    themeCount: number;
    sourceCount: number;
    channelCount?: number;
    successCount?: number;
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
