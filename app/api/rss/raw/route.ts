"use server";

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRawRSSItems } from "@/lib/redis";

/**
 * 获取原始 RSS 条目
 * GET /api/rss/raw?userId=xxx&limit=200
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "200", 10);
    const apiKey = searchParams.get("apiKey");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "缺少 userId 参数" },
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

    const items = await getRawRSSItems(userId, limit);
    return NextResponse.json({
      success: true,
      data: {
        totalItems: items.length,
        items,
      },
    });
  } catch (error: any) {
    console.error("获取原始 RSS 数据失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "服务器错误" },
      { status: 500 }
    );
  }
}
