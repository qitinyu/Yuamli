import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

// ==================== Cookie helpers ====================

/** Encode session user into a base64 cookie value */
function encodeSessionCookie(
  user: { id: string; name: string; avatar: string; type: "github" | "guest"; email: string }
): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

/** Get the cookie options for the session cookie */
function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAge || 60 * 60 * 24 * 7,
    path: "/",
  };
}

// ==================== Read cookies (works in Route Handlers) ====================

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie) return null;
  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    return JSON.parse(decoded) as SessionUser;
  } catch { return null; }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE);
  return adminCookie?.value === "1";
}

// ==================== Write cookies on NextResponse objects ====================
// In Next.js 15+/16 Route Handlers, cookies() returns a read-only jar.
// To SET cookies, we must use NextResponse.cookies.set() on the response object.

/** Create a JSON response with the session cookie attached */
export function sessionResponse<T extends object>(
  data: T,
  user: { id: string; name: string; avatar: string; type: "github" | "guest"; email: string },
  maxAge?: number
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.set(SESSION_COOKIE, encodeSessionCookie(user), sessionCookieOptions(maxAge));
  return response;
}

/** Attach a session cookie to an existing NextResponse (e.g. a redirect) */
export function attachSessionToResponse(
  response: NextResponse,
  user: { id: string; name: string; avatar: string; type: "github" | "guest"; email: string },
  maxAge?: number
): void {
  response.cookies.set(SESSION_COOKIE, encodeSessionCookie(user), sessionCookieOptions(maxAge));
}

/** Create a response that clears the session cookie */
export function clearSessionResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

/** Attach admin auth cookie to a response */
export function attachAdminToResponse(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
}

/** Create a response with admin auth cookie */
export function adminAuthResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  attachAdminToResponse(response);
  return response;
}

/** Create a response that clears the admin cookie */
export function clearAdminResponse<T extends object>(data: T): NextResponse<T> {
  const response = NextResponse.json(data);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}