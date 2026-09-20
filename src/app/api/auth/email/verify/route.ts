import { NextRequest, NextResponse } from "next/server";
import {
  getEmailCode,
  setEmailCode,
  deleteEmailCode,
  getUserByOAuthId,
  addUser,
  type User,
} from "@/lib/storage";
import { attachSessionToResponse } from "@/lib/auth";

/**
 * POST /api/auth/email/verify  { email, code }
 * Verifies the 6-digit code and logs the user in (auto-registers on first use).
 * Email accounts use the id prefix "email_" + normalized address.
 */

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: "请输入邮箱和 6 位验证码" },
        { status: 400 }
      );
    }

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

    const userId = `email_${email}`;
    let user: User | undefined = await getUserByOAuthId(userId);
    if (!user) {
      user = await addUser({
        id: userId,
        name: email.split("@")[0].slice(0, 20) || "邮箱用户",
        email,
        avatar: "",
        type: "email",
        createdAt: new Date().toISOString(),
      });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };
    const response = NextResponse.json({ ok: true, user: sessionUser });
    attachSessionToResponse(response, sessionUser);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "登录失败，请重试" },
      { status: 500 }
    );
  }
}
