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

    // 仅清空当前用户的 seen 标记（项目无 next-auth，不提供 all 范围）
    const pattern = `user:${userId}:seen:*`;

    let cursor = 0;
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: pattern, count: 100 });
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = kv.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    return NextResponse.json({
      success: true,
      message: `成功删除了 ${deletedCount} 条抓取历史记录`,
      scope: "current_user",
    });
  } catch (error: any) {
    console.error("清空历史记录失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
