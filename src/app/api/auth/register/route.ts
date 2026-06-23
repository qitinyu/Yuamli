import { NextRequest, NextResponse } from "next/server";
import { getUserByQQ, getUserByEmail, addUser } from "@/lib/storage";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, qq, email, password } = body;

    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 1 ||
      name.trim().length > 20
    ) {
      return NextResponse.json(
        { ok: false, error: "昵称需 1-20 个字符" },
        { status: 400 }
      );
    }

    const qqStr = qq ? String(qq).trim() : "";
    if (!qqStr || !/^\d{5,12}$/.test(qqStr)) {
      return NextResponse.json(
        { ok: false, error: "QQ 号为必填项，需 5-12 位数字" },
        { status: 400 }
      );
    }

    const emailStr = email ? String(email).trim().toLowerCase() : "";
    if (emailStr) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return NextResponse.json(
          { ok: false, error: "邮箱格式不正确" },
          { status: 400 }
        );
      }
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "密码至少 6 个字符" },
        { status: 400 }
      );
    }

    const existingQQ = await getUserByQQ(qqStr);
    if (existingQQ) {
      return NextResponse.json(
        { ok: false, error: "该 QQ 号已注册" },
        { status: 409 }
      );
    }

    if (emailStr) {
      const existingEmail = await getUserByEmail(emailStr);
      if (existingEmail) {
        return NextResponse.json(
          { ok: false, error: "该邮箱已注册" },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();

    const user = {
      id: userId,
      name: name.trim(),
      email: emailStr,
      avatar: "/default-avatar.png",
      type: "guest" as const,
      password: hashPassword(password),
      qq: qqStr,
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

    await createSession(sessionUser);

    return NextResponse.json({ ok: true, user: sessionUser });
  } catch {
    return NextResponse.json(
      { ok: false, error: "注册失败，请重试" },
      { status: 500 }
    );
  }
}