import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getCurrentUserFromCookie(request.headers.get("cookie"));
  
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  return NextResponse.json({
    authenticated: true,
    userId: user.userId,
    username: user.username,
  });
}
