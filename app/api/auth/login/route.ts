import { NextRequest, NextResponse } from "next/server";
import { verifyUser, generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证用户
    const result = await verifyUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // 生成 Token
    const token = generateToken(result.user!.id, username);

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      userId: result.user!.id,
      username,
      redirectTo: "/dashboard"
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 天
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "登录失败：" + error.message },
      { status: 500 }
    );
  }
}
