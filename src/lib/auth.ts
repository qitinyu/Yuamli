import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserType } from "./storage";

export interface SessionUser {
  id: string;
  name: string;
  avatar: string;
  type: UserType;
  email: string;
}

const SESSION_COOKIE = "yuamli_session";
const ADMIN_COOKIE = "yuamli_admin";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 天
const ADMIN_TTL = 60 * 60 * 2; // 2 小时

// ==================== 签名密钥 ====================

/**
 * Cookie 签名密钥。生产环境请配置 AUTH_SECRET。
 * 未配置时按进程随机生成 —— 不会出现「固定弱密钥」，代价是重启后所有人重新登录。
 */
const FALLBACK_SECRET = randomBytes(32).toString("hex");

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] 未配置 AUTH_SECRET（或长度不足 16），正在使用进程内随机密钥：重启后所有登录态失效。请在环境变量中设置 AUTH_SECRET。"
    );
  }
  return FALLBACK_SECRET;
}

// ==================== Token 签名 / 校验 ====================

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function createToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = b64url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

function readToken<T>(token: string | undefined): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (typeof data?.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return data as T;
  } catch {
    return null;
  }
}

// ==================== 密码哈希 ====================

/** 旧版 32 位弱哈希 —— 仅用于校验历史数据，不再用于写入。 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** 新格式：scrypt$<salt>$<derivedKey> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;

  if (stored.startsWith("scrypt$")) {
    const [, salt, expectedHex] = stored.split("$");
    if (!salt || !expectedHex) return false;
    try {
      const derived = scryptSync(password, salt, 64);
      const expected = Buffer.from(expectedHex, "hex");
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  // 兼容旧哈希
  return simpleHash(password) === stored;
}

/** 登录成功后是否需要把旧哈希升级为 scrypt */
export function needsRehash(stored: string | undefined): boolean {
  return !!stored && !stored.startsWith("scrypt$");
}

// ==================== Cookie 选项 ====================

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAge || SESSION_TTL,
    path: "/",
  };
}

// ==================== 会话 ====================

interface SessionTokenPayload {
  role: "session";
  user: SessionUser;
  exp: number;
}

function encodeSessionCookie(user: SessionUser, maxAge?: number): string {
  return createToken({ role: "session", user }, maxAge || SESSION_TTL);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const data = readToken<SessionTokenPayload>(
    cookieStore.get(SESSION_COOKIE)?.value
  );
  if (!data || data.role !== "session" || !data.user?.id) return null;
  return data.user;
}

export function sessionResponse<T extends object>(
  data: T,
  user: SessionUser,
  maxAge?: number
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.set(
    SESSION_COOKIE,
    encodeSessionCookie(user, maxAge),
    cookieOptions(maxAge)
  );
  return response;
}

export function attachSessionToResponse(
  response: NextResponse,
  user: SessionUser,
  maxAge?: number
): void {
  response.cookies.set(
    SESSION_COOKIE,
    encodeSessionCookie(user, maxAge),
    cookieOptions(maxAge)
  );
}

export function clearSessionResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

// ==================== 管理员 ====================

interface AdminTokenPayload {
  role: "admin";
  exp: number;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const data = readToken<AdminTokenPayload>(
    cookieStore.get(ADMIN_COOKIE)?.value
  );
  return !!data && data.role === "admin";
}

export function attachAdminToResponse(response: NextResponse): void {
  response.cookies.set(
    ADMIN_COOKIE,
    createToken({ role: "admin" }, ADMIN_TTL),
    cookieOptions(ADMIN_TTL)
  );
}

export function adminAuthResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  attachAdminToResponse(response);
  return response;
}

export function clearAdminResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
