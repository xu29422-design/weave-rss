import { NextRequest, NextResponse } from "next/server";
import { createUser, generateToken } from "@/lib/auth";

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

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "用户名长度必须在 3-20 个字符之间" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少为 6 个字符" },
        { status: 400 }
      );
    }

    // 创建用户
    const result = await createUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 生成 Token
    const token = generateToken(result.userId!, username);

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      userId: result.userId,
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
      { error: "注册失败：" + error.message },
      { status: 500 }
    );
  }
}
