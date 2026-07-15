import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import fs from "fs";
import path from "path";

const CHANGELOG_FILE = path.join(process.cwd(), "public", "changelog.json");

function readChangelog() {
  try {
    const raw = fs.readFileSync(CHANGELOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeChangelog(data: unknown[]) {
  const dir = path.dirname(CHANGELOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CHANGELOG_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const changelog = readChangelog();
    return NextResponse.json({ changelog });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { changelog } = body;

    if (!Array.isArray(changelog)) {
      return NextResponse.json(
        { ok: false, message: "格式错误" },
        { status: 400 }
      );
    }

    writeChangelog(changelog);
    return NextResponse.json({ ok: true, message: "更新日志已保存" });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}