import { cookies } from "next/headers";
import { getUserById, getUserByEmail, getUserByQQ, getUserByGithubId } from "./storage";

export interface SessionUser {
  id: string;
  name: string;
  avatar: string;
  type: "github" | "guest";
  email: string;
}

const SESSION_COOKIE = "yuamli_session";
const ADMIN_COOKIE = "yuamli_admin";

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function hashPassword(password: string): string { return simpleHash(password); }
export function verifyPassword(password: string, hash: string): boolean { return simpleHash(password) === hash; }

export async function createSession(
  user: { id: string; name: string; avatar: string; type: "github" | "guest"; email: string },
  maxAge?: number
): Promise<void> {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify(user);
  const encoded = Buffer.from(sessionData).toString("base64");
  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAge || 60 * 60 * 24 * 7, // default 7 days, 30 days for "remember me"
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie) return null;
  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    return JSON.parse(decoded) as SessionUser;
  } catch { return null; }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function setAdminAuthenticated(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 2, path: "/",
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE);
  return adminCookie?.value === "1";
}

export async function clearAdminAuth(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

// Create session directly on a Response object (for redirect scenarios)
export function setSessionOnResponse(
  response: Response,
  user: { id: string; name: string; avatar: string; type: "github" | "guest"; email: string }
): void {
  const sessionData = JSON.stringify(user);
  const encoded = Buffer.from(sessionData).toString("base64");
  (response as any).cookies?.set?.("yuamli_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}