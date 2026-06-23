import { NextRequest, NextResponse } from "next/server";
import { getUsers, getConfig, updateConfig } from "@/lib/storage";
import {
  setAdminAuthenticated,
  isAdminAuthenticated,
  clearAdminAuth,
  verifyPassword,
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
        { ok: false, message: "Invalid admin password" },
        { status: 401 }
      );
    }

    await setAdminAuthenticated();

    return NextResponse.json({ ok: true });
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

    await clearAdminAuth();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}