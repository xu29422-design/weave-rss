"use server";

import { NextRequest, NextResponse } from "next/server";
import { createKVClient, getSettings, savePushChannels, getPushChannels, PushChannel } from "@/lib/redis";
import { kv } from "@vercel/kv";

/**
 * 将 Settings 中的 Webhook 配置迁移到 PushChannel 系统
 * POST /api/admin/migrate-webhook
 * Body: { username }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "缺少用户名" },
        { status: 400 }
      );
    }

    // 1. 根据用户名查找用户ID
    const user = await kv.get<any>(`user:username:${username}`);
    
    if (!user) {
      return NextResponse.json(
        { error: `未找到用户: ${username}` },
        { status: 404 }
      );
    }

    const userId = user.id;

    // 2. 获取当前配置
    const kvClient = createKVClient();
    if (!kvClient) {
      return NextResponse.json(
        { error: "KV 客户端未初始化" },
        { status: 500 }
      );
    }

    const settings = await getSettings(userId);
    if (!settings) {
      return NextResponse.json(
        { error: "未找到用户配置" },
        { status: 404 }
      );
    }

    // 检查是否已有 Webhook 配置
    if (!settings.webhookUrl) {
      return NextResponse.json(
        { error: "Settings 中未找到 Webhook 配置" },
        { status: 400 }
      );
    }

    // 3. 检查是否已有 PushChannel 中的 Webhook 渠道
    const existingChannels = await getPushChannels(userId);
    const existingWebhookChannel = existingChannels.find(c => c.type === 'webhook');
    
    let result;
    if (existingWebhookChannel) {
      // 更新现有渠道
      const updatedChannels = existingChannels.map(channel => {
        if (channel.id === existingWebhookChannel.id) {
          return {
            ...channel,
            webhookUrl: settings.webhookUrl!,
            enabled: true,
          };
        }
        return channel;
      });
      
      await savePushChannels(userId, updatedChannels);
      result = {
        action: 'updated',
        channelId: existingWebhookChannel.id,
        channelName: existingWebhookChannel.name,
      };
    } else {
      // 创建新的 Webhook 推送渠道
      const newChannel: PushChannel = {
        id: `channel_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'webhook',
        name: '机器人推送',
        webhookUrl: settings.webhookUrl!,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      
      const updatedChannels = [...existingChannels, newChannel];
      await savePushChannels(userId, updatedChannels);
      
      result = {
        action: 'created',
        channelId: newChannel.id,
        channelName: newChannel.name,
      };
    }

    return NextResponse.json({
      success: true,
      message: `Webhook 配置已${result.action === 'created' ? '创建' : '更新'}到 PushChannel 系统`,
      userId,
      result,
    });

  } catch (error: any) {
    console.error("迁移失败:", error);
    return NextResponse.json(
      { error: error.message || "迁移失败" },
      { status: 500 }
    );
  }
}
