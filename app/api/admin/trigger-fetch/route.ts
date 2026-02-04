"use server";

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRSSSources, getSettings } from "@/lib/redis";
import { fetchNewItems } from "@/lib/rss-utils";

/**
 * 直接触发一次 RSS 抓取（不依赖 Inngest）
 * POST /api/admin/trigger-fetch
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

    const settings = await getSettings(userId);
    const rssSources = await getRSSSources(userId);

    if (!settings || rssSources.length === 0) {
      return NextResponse.json(
        { success: false, error: "未配置 RSS 源或设置" },
        { status: 400 }
      );
    }

    const items = await fetchNewItems(userId, rssSources, settings.superSubKeyword);

    return NextResponse.json({
      success: true,
      data: {
        totalItems: items.length,
        sample: items.slice(0, 3),
      },
    });
  } catch (error: any) {
    console.error("触发 RSS 抓取失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "服务器错误" },
      { status: 500 }
    );
  }
}
