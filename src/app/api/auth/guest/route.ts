import { NextRequest, NextResponse } from "next/server";
import { getUserByQQ, addUser } from "@/lib/storage";
import { hashPassword, verifyPassword, sessionResponse } from "@/lib/auth";

/**
 * POST /api/auth/guest — 游客「注册即登录」
 *
 * Body: { name, account, password, remember? }
 * - 账号已存在 → 校验密码后直接登录（忽略昵称）
 * - 账号不存在 → 注册并登录
 *
 * Response: { ok, user, mode: "login" | "register" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const remember = body.remember === true;

    if (!account || !/^\d{5,12}$/.test(account)) {
      return NextResponse.json(
        { ok: false, error: "账号需为 5-12 位数字" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "密码至少 6 个字符" },
        { status: 400 }
      );
    }

    const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;

    // ===== existing account → login =====
    const existing = await getUserByQQ(account);
    if (existing) {
      const valid = existing.password
        ? verifyPassword(password, existing.password)
        : false;
      if (!valid) {
        return NextResponse.json(
          { ok: false, error: "该账号已注册，密码错误" },
          { status: 401 }
        );
      }
      const sessionUser = {
        id: existing.id,
        name: existing.name,
        avatar: existing.avatar,
        type: existing.type,
        email: existing.email,
      };
      return sessionResponse(
        { ok: true, user: sessionUser, mode: "login" },
        sessionUser,
        maxAge
      );
    }

    // ===== new account → register + login =====
    if (!name || name.length < 1 || name.length > 20) {
      return NextResponse.json(
        { ok: false, error: "昵称需 1-20 个字符" },
        { status: 400 }
      );
    }
    if (!/^\d{6,10}$/.test(account)) {
      return NextResponse.json(
        { ok: false, error: "账号需为 6-10 位数字" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      name,
      email: "",
      avatar: "/default-avatar.png",
      type: "guest" as const,
      password: hashPassword(password),
      qq: account,
      createdAt: now,
    };

    await addUser(user);

    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };

    return sessionResponse(
      { ok: true, user: sessionUser, mode: "register" },
      sessionUser,
      maxAge
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "操作失败，请重试" },
      { status: 500 }
    );
  }
}
