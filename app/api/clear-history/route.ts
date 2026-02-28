import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUserFromCookie } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");
    const user = getCurrentUserFromCookie(authToken ? `auth_token=${authToken.value}` : null);
    if (!user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.userId;

    // 仅清空当前用户的 seen 标记；单次请求限制数量，避免 FUNCTION_INVOCATION_TIMEOUT（Vercel 约 10s）
    const pattern = `user:${userId}:seen:*`;
    const MAX_ITERATIONS = 10;
    const KEYS_PER_SCAN = 150;

    let cursor = 0;
    let deletedCount = 0;
    let iterations = 0;
    let hasMore = false;

    while (iterations < MAX_ITERATIONS) {
      const [nextCursor, keys] = await kv.scan(cursor, { match: pattern, count: KEYS_PER_SCAN });
      cursor = nextCursor;
      iterations += 1;

      if (keys.length > 0) {
        const pipeline = kv.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        deletedCount += keys.length;
      }

      if (cursor === 0) break;
      hasMore = true;
    }

    return NextResponse.json({
      success: true,
      message: hasMore
        ? `已删除 ${deletedCount} 条，还有更多。请再次点击「清空历史」继续。`
        : `成功删除了 ${deletedCount} 条抓取历史记录`,
      scope: "current_user",
      deletedCount,
      hasMore,
    });
  } catch (error: any) {
    console.error("清空历史记录失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
