import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing in production!");
}

// 开发环境兜底，生产环境必须配置
const SAFE_JWT_SECRET = JWT_SECRET || "dev-secret-key-only-for-local-testing";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

/**
 * 创建新用户
 */
export async function createUser(username: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // 检查用户名是否已存在
    const existingUser = await kv.get<User>(`user:username:${username}`);
    if (existingUser) {
      return { success: false, error: "用户名已存在" };
    }

    // 生成用户 ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户对象
    const user: User = {
      id: userId,
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // 存储用户数据（两个索引：按 ID 和按用户名）
    await kv.set(`user:id:${userId}`, user);
    await kv.set(`user:username:${username}`, user);

    // 将用户 ID 加入活跃用户列表
    await kv.sadd("users:active", userId);

    return { success: true, userId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 验证用户登录
 */
export async function verifyUser(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const user = await kv.get<User>(`user:username:${username}`);
    
    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 生成 JWT Token
 */
export function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, SAFE_JWT_SECRET, { expiresIn: "30d" });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const decoded = jwt.verify(token, SAFE_JWT_SECRET) as { userId: string; username: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 获取所有活跃用户 ID 列表
 */
export async function getAllActiveUsers(): Promise<string[]> {
  try {
    const userIds = await kv.smembers("users:active");
    return userIds as string[];
  } catch {
    return [];
  }
}

/**
 * 从请求的 Cookie 中获取当前用户
 */
export function getCurrentUserFromCookie(cookieHeader: string | null): { userId: string; username: string } | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('auth_token='));
  
  if (!authCookie) return null;
  
  const token = authCookie.split('=')[1];
  return verifyToken(token);
}
