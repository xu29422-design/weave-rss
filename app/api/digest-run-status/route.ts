import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { getDigestRunStatus } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  const user = getCurrentUserFromCookie(cookie);

  if (!user?.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const status = await getDigestRunStatus(user.userId);
  return NextResponse.json(status || { status: "idle", progress: 0 });
}
