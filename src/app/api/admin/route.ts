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
    const { password, newPassword } = body;

    // Change password mode
    if (newPassword !== undefined) {
      const admin = await isAdminAuthenticated();
      if (!admin) {
        return NextResponse.json(
          { ok: false, message: "Admin authentication required" },
          { status: 403 }
        );
      }
      if (typeof newPassword !== "string" || newPassword.trim().length < 4) {
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
      const hashed = hashPassword(newPassword);
      await updateConfig({ adminPassword: hashed });
      return NextResponse.json({ ok: true, message: "密码修改成功" });
    }

    // Normal login mode
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, message: "Password is required" },
        { status: 400 }
      );
    }

    const config = await getConfig();

    if (!verifyPassword(password, config.adminPassword)) {
      return NextResponse.json(
        { ok: false, message: "Invalid admin password" },
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