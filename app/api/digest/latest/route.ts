"use server";

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * 获取最新的简报数据
 * GET /api/digest/latest?userId=xxx&days=1
 * 供 WPS 多维表格 AirScript 调用
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const days = parseInt(searchParams.get("days") || "1", 10);
    const apiKey = searchParams.get("apiKey");

    // 基本参数验证
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "缺少 userId 参数" 
        },
        { status: 400 }
      );
    }

    // 可选：API Key 验证（用于安全性）
    // 如果设置了 API Key，则需要验证
    if (apiKey) {
      const storedApiKey = await kv.get(`user:${userId}:apiKey`);
      if (apiKey !== storedApiKey) {
        return NextResponse.json(
          { 
            success: false, 
            error: "API Key 验证失败" 
          },
          { status: 401 }
        );
      }
    }

    // 获取指定天数的推送日志
    const logs = await kv.lrange(`user:${userId}:pushLogs`, 0, days - 1);
    
    if (!logs || logs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          message: "暂无数据"
        }
      });
    }

    // 解析最新的日志数据
    const latestLog: any = logs[0];
    
    if (!latestLog) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          message: "暂无数据"
        }
      });
    }

    // 构建返回数据
    const items: any[] = [];
    
    // 从简报内容中提取数据项
    // 这里需要根据实际的数据结构来解析
    if (latestLog.digestData && latestLog.digestData.highQualityItems) {
      latestLog.digestData.highQualityItems.forEach((item: any) => {
        items.push({
          title: item.title || "无标题",
          content: item.content || item.description || "",
          summary: item.summary || "",
          source: item.link || "",
          publishTime: item.pubDate || new Date().toISOString(),
          category: item.category || "",
          quality: item.quality || 0
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date: latestLog.timestamp || new Date().toISOString(),
        totalItems: items.length,
        items: items,
        reportContent: latestLog.reportContent || ""
      }
    });

  } catch (error: any) {
    console.error("获取最新简报失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "服务器错误" 
      },
      { status: 500 }
    );
  }
}

/**
 * 生成 API Key
 * POST /api/digest/latest
 * Body: { userId: "xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "缺少 userId" 
        },
        { status: 400 }
      );
    }

    // 生成新的 API Key
    const apiKey = `wps_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 存储 API Key
    await kv.set(`user:${userId}:apiKey`, apiKey);

    return NextResponse.json({
      success: true,
      data: {
        apiKey,
        message: "API Key 已生成，请妥善保管"
      }
    });

  } catch (error: any) {
    console.error("生成 API Key 失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "服务器错误" 
      },
      { status: 500 }
    );
  }
}
