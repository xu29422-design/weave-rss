import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // 清除 Cookie
  response.cookies.delete("auth_token");
  
  return response;
}
