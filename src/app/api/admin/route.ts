import { NextRequest, NextResponse } from "next/server";
import { getUsers, getConfig, updateConfig } from "@/lib/storage";
import {
  verifyPassword,
  hashPassword,
  isAdminAuthenticated,
  adminAuthResponse,
  clearAdminResponse,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, message: "Password is required" },
        { status: 400 }
      );
    }

    const config = await getConfig();

    if (!verifyPassword(password, config.adminPassword)) {
      return NextResponse.json(
        { ok: false, message: "管理密码错误" },
        { status: 401 }
      );
    }

    return adminAuthResponse({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const users = await getUsers();
    const config = await getConfig();

    const safeConfig = {
      ...config,
      adminPassword: "******",
    };

    return NextResponse.json({ users, config: safeConfig });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin — Change admin password
export async function PUT(request: NextRequest) {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password, newPassword } = body;

    if (!password || !newPassword || typeof password !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { ok: false, message: "请填写原密码和新密码" },
        { status: 400 }
      );
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { ok: false, message: "新密码至少 4 个字符" },
        { status: 400 }
      );
    }

    const config = await getConfig();

    if (!verifyPassword(password, config.adminPassword)) {
      return NextResponse.json(
        { ok: false, message: "原密码错误" },
        { status: 401 }
      );
    }

    await updateConfig({ adminPassword: hashPassword(newPassword.trim()) });

    return NextResponse.json({ ok: true, message: "密码修改成功" });
  } catch {
    return NextResponse.json(
      { ok: false, message: "密码修改失败" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    return clearAdminResponse({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}