import { NextRequest, NextResponse } from "next/server";
import { getUserByQQ, getUserByEmail, addUser } from "@/lib/storage";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password, remember } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "请填写账号和密码" },
        { status: 400 }
      );
    }

    // Prioritize QQ lookup, then email
    const user = getUserByQQ(identifier.trim()) || getUserByEmail(identifier.trim().toLowerCase());

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "账号不存在，请先注册" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = password && user.password ? (await import("@/lib/auth")).verifyPassword(password, user.password) : false;
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "密码错误，请检查后重试" },
        { status: 401 }
      );
    }

    // Session: 30 days if "remember me", else 7 days
    const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;

    await createSession({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    }, maxAge);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        type: user.type,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "登录失败，请重试" },
      { status: 500 }
    );
  }
}