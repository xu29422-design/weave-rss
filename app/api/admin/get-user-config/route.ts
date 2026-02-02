"use server";

import { NextRequest, NextResponse } from "next/server";
import { createKVClient } from "@/lib/redis";
import { kv } from "@vercel/kv";

/**
 * 获取用户配置的 API
 * POST /api/admin/get-user-config
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

    // 根据用户名查找用户ID
    const user = await kv.get<any>(`user:username:${username}`);
    
    if (!user) {
      return NextResponse.json(
        { error: `未找到用户: ${username}` },
        { status: 404 }
      );
    }

    const userId = user.id;

    // 获取配置
    const kvClient = createKVClient();
    if (!kvClient) {
      return NextResponse.json(
        { error: "KV 客户端未初始化" },
        { status: 500 }
      );
    }

    const settings = await kvClient.get<any>(`user:${userId}:settings`);

    return NextResponse.json({
      success: true,
      userId,
      settings: settings ? {
        ...settings,
        kdocsAppSecret: settings.kdocsAppSecret ? settings.kdocsAppSecret.substring(0, 8) + '...' : undefined,
      } : null
    });

  } catch (error: any) {
    console.error("获取配置失败:", error);
    return NextResponse.json(
      { error: error.message || "获取配置失败" },
      { status: 500 }
    );
  }
}
