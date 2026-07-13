import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getChangelog,
  addChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
} from "@/lib/storage";

export async function GET() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }
    const entries = await getChangelog();
    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error("Failed to get changelog:", error);
    return NextResponse.json(
      { ok: false, message: "获取更新日志失败" },
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
    const { action, entry } = body;

    if (action === "add") {
      const newEntry = await addChangelogEntry(entry);
      return NextResponse.json({ ok: true, entry: newEntry });
    }

    if (action === "update") {
      const updated = await updateChangelogEntry(entry.id, entry);
      if (!updated) {
        return NextResponse.json(
          { ok: false, message: "条目不存在" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, entry: updated });
    }

    if (action === "delete") {
      const deleted = await deleteChangelogEntry(entry.id);
      if (!deleted) {
        return NextResponse.json(
          { ok: false, message: "条目不存在" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, message: "未知操作" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Changelog operation failed:", error);
    return NextResponse.json(
      { ok: false, message: "操作失败" },
      { status: 500 }
    );
  }
}
