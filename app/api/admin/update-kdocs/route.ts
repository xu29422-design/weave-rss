"use server";

import { NextRequest, NextResponse } from "next/server";
import { createKVClient } from "@/lib/redis";
import { kv } from "@vercel/kv";

/**
 * 管理员更新用户轻维表配置的 API
 * POST /api/admin/update-kdocs
 * Body: { username, kdocsAppId, kdocsAppSecret, kdocsFileToken, kdocsDBSheetId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, kdocsAppId, kdocsAppSecret, kdocsFileToken, kdocsDBSheetId } = body;

    if (!username || !kdocsAppId || !kdocsAppSecret || !kdocsFileToken) {
      return NextResponse.json(
        { error: "缺少必要参数" },
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

    const currentSettings = await kvClient.get<any>(`user:${userId}:settings`);

    // 3. 更新配置
    const updatedSettings = {
      ...currentSettings,
      kdocsAppId,
      kdocsAppSecret,
      kdocsFileToken,
      kdocsDBSheetId: kdocsDBSheetId || "",
      enableKdocsPush: true,
    };

    await kvClient.set(`user:${userId}:settings`, updatedSettings);

    return NextResponse.json({
      success: true,
      message: "轻维表配置已更新",
      userId,
      config: {
        kdocsAppId,
        kdocsFileToken,
        kdocsDBSheetId: kdocsDBSheetId || "(需要填写)",
        enableKdocsPush: true,
      }
    });

  } catch (error: any) {
    console.error("更新配置失败:", error);
    return NextResponse.json(
      { error: error.message || "更新配置失败" },
      { status: 500 }
    );
  }
}
