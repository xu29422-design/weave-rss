"use server";

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { inngest } from "@/inngest/client";

/**
 * 手动触发指定用户的简报抓取与推送
 * POST /api/admin/trigger-digest
 * Body: { userId: string, apiKey?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey } = body || {};

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "缺少 userId" },
        { status: 400 }
      );
    }

    if (apiKey) {
      const storedApiKey = await kv.get(`user:${userId}:apiKey`);
      if (apiKey !== storedApiKey) {
        return NextResponse.json(
          { success: false, error: "API Key 验证失败" },
          { status: 401 }
        );
      }
    }

    await inngest.send({
      name: "digest/generate",
      data: {
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "已触发抓取与简报生成",
    });
  } catch (error: any) {
    console.error("触发简报失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "服务器错误" },
      { status: 500 }
    );
  }
}
