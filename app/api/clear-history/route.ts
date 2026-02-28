import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const clearAll = url.searchParams.get("all") === "true";

    // 匹配该用户的所有 seen 标记
    const pattern = clearAll ? `user:*:seen:*` : `user:${userId}:seen:*`;
    
    let cursor = 0;
    let deletedCount = 0;

    do {
      // 使用 scan 查找匹配的 key
      const [nextCursor, keys] = await kv.scan(cursor, { match: pattern, count: 100 });
      cursor = nextCursor;

      if (keys.length > 0) {
        // 批量删除找到的 key
        const pipeline = kv.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    return NextResponse.json({ 
      success: true, 
      message: `成功删除了 ${deletedCount} 条抓取历史记录`,
      scope: clearAll ? "all_users" : "current_user"
    });
  } catch (error: any) {
    console.error("清空历史记录失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
