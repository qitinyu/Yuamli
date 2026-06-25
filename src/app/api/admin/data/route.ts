import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readData, writeData } from "@/lib/adapter";

// GET /api/admin/data — Export all data as a downloadable JSON backup
export async function GET() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    // Read all three data stores in parallel
    const [comments, users, config] = await Promise.all([
      readData("comments", []),
      readData("users", []),
      readData("config", {}),
    ]);

    const backup = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        source: "Yuamli",
      },
      comments,
      users,
      config,
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `yuamli-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { ok: false, message: "导出失败" },
      { status: 500 }
    );
  }
}

// POST /api/admin/data — Import (restore) data from a backup JSON
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
    const { comments, users, config, mode } = body;

    // Validate: at least one data section must be present
    if (!comments && !users && !config) {
      return NextResponse.json(
        { ok: false, message: "备份文件中未找到有效数据" },
        { status: 400 }
      );
    }

    // mode: "overwrite" = replace all, "merge" = merge into existing (default)
    const isOverwrite = mode === "overwrite";
    let stats = { comments: 0, users: 0, config: false };

    if (comments && Array.isArray(comments)) {
      if (isOverwrite) {
        await writeData("comments", comments);
        stats.comments = comments.length;
      } else {
        // Merge: add comments that don't already exist (by id)
        const existing = await readData("comments", []);
        const existingIds = new Set(existing.map((c: any) => c.id));
        const newComments = comments.filter((c: any) => !existingIds.has(c.id));
        const merged = [...newComments, ...existing];
        await writeData("comments", merged);
        stats.comments = newComments.length;
      }
    }

    if (users && Array.isArray(users)) {
      if (isOverwrite) {
        await writeData("users", users);
        stats.users = users.length;
      } else {
        // Merge: add users that don't already exist (by id)
        const existing = await readData("users", []);
        const existingIds = new Set(existing.map((u: any) => u.id));
        const newUsers = users.filter((u: any) => !existingIds.has(u.id));
        const merged = [...newUsers, ...existing];
        await writeData("users", merged);
        stats.users = newUsers.length;
      }
    }

    if (config && typeof config === "object") {
      await writeData("config", config);
      stats.config = true;
    }

    const modeLabel = isOverwrite ? "覆盖" : "合并";

    return NextResponse.json({
      ok: true,
      message: `数据${modeLabel}完成`,
      stats,
      mode: modeLabel,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { ok: false, message: "导入失败，请检查文件格式" },
      { status: 500 }
    );
  }
}