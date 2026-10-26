import { NextRequest, NextResponse } from "next/server";
import {
  getEmailCode,
  setEmailCode,
  deleteEmailCode,
  getUserByEmail,
  getUserByOAuthId,
  addUser,
  updateUser,
  type User,
} from "@/lib/storage";
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  sessionResponse,
} from "@/lib/auth";

/**
 * POST /api/auth/guest — 邮箱即游客账号（注册 / 登录 / 重置密码 三合一）
 *
 * Body: { email, password, code, remember? }
 *
 * 前置：验证码必须正确（由 /api/auth/email/send 发出）
 * - 账号不存在        → 用当前密码注册并登录   mode = "register"
 * - 账号存在且密码正确 → 直接登录             mode = "login"
 * - 账号存在但密码错误 → 用验证码重置密码后登录 mode = "reset"
 *
 * 验证码本身已证明邮箱归属，因此「忘记密码」无需额外流程：
 * 直接获取验证码 + 输入新密码即可重置。
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const remember = body?.remember === true;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "密码至少 6 个字符" },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: "请输入 6 位验证码" },
        { status: 400 }
      );
    }

    // ===== 1. 校验验证码 =====
    const entry = await getEmailCode(email);
    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "验证码不存在或已过期，请重新获取" },
        { status: 400 }
      );
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      await deleteEmailCode(email);
      return NextResponse.json(
        { ok: false, error: "尝试次数过多，请重新获取验证码" },
        { status: 429 }
      );
    }
    if (entry.code !== code) {
      entry.attempts += 1;
      await setEmailCode(email, entry);
      return NextResponse.json(
        { ok: false, error: "验证码错误" },
        { status: 400 }
      );
    }
    await deleteEmailCode(email);

    const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;

    // ===== 2. 查找账号 =====
    const existingByEmail = await getUserByEmail(email);
    let user: User | undefined = existingByEmail;

    if (existingByEmail && existingByEmail.type !== "email" && existingByEmail.type !== "guest") {
      return NextResponse.json(
        {
          ok: false,
          error: `该邮箱已绑定 ${existingByEmail.type} 账号，请改用对应的第三方登录`,
        },
        { status: 409 }
      );
    }

    if (!user) {
      user = await getUserByOAuthId(`email_${email}`);
    }

    // ===== 3. 登录 / 重置密码 / 注册 =====
    if (user) {
      const passwordMatches = verifyPassword(password, user.password);

      if (passwordMatches && !needsRehash(user.password)) {
        return sessionResponse(
          { ok: true, user: toSessionUser(user), mode: "login" },
          toSessionUser(user),
          maxAge
        );
      }

      // 密码不匹配（或旧哈希需要升级）→ 以验证码为准重置/升级密码
      const updated = await updateUser(user.id, {
        password: hashPassword(password),
        ...(user.email ? {} : { email }),
      });
      const finalUser = updated || user;

      return sessionResponse(
        {
          ok: true,
          user: toSessionUser(finalUser),
          mode: passwordMatches ? "login" : "reset",
        },
        toSessionUser(finalUser),
        maxAge
      );
    }

    // ===== 4. 注册新账号 =====
    const now = new Date().toISOString();
    const newUser: User = {
      id: `email_${email}`,
      name: email.split("@")[0].slice(0, 20) || "邮箱用户",
      email,
      avatar: "",
      type: "email",
      password: hashPassword(password),
      createdAt: now,
    };
    await addUser(newUser);

    return sessionResponse(
      { ok: true, user: toSessionUser(newUser), mode: "register" },
      toSessionUser(newUser),
      maxAge
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "登录失败，请重试" },
      { status: 500 }
    );
  }
}

function toSessionUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    type: user.type,
    email: user.email,
  };
}
