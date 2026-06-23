import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getComments, batchDeleteComments, batchUpdateComments } from "@/lib/storage";

// GET: List all comments for admin management
export async function GET() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const comments = getComments();
    // Sort by createdAt desc
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Batch operations on comments
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
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, message: "缺少操作类型或留言ID" },
        { status: 400 }
      );
    }

    switch (action) {
      case "batch_delete": {
        const count = batchDeleteComments(ids);
        return NextResponse.json({ ok: true, message: `已删除 ${count} 条留言` });
      }
      case "batch_pin": {
        const count = batchUpdateComments(ids, { isPinned: true });
        return NextResponse.json({ ok: true, message: `已置顶 ${count} 条留言` });
      }
      case "batch_unpin": {
        const count = batchUpdateComments(ids, { isPinned: false });
        return NextResponse.json({ ok: true, message: `已取消置顶 ${count} 条留言` });
      }
      case "batch_feature": {
        const count = batchUpdateComments(ids, { isFeatured: true });
        return NextResponse.json({ ok: true, message: `已设为精华 ${count} 条留言` });
      }
      case "batch_unfeature": {
        const count = batchUpdateComments(ids, { isFeatured: false });
        return NextResponse.json({ ok: true, message: `已取消精华 ${count} 条留言` });
      }
      default:
        return NextResponse.json(
          { ok: false, message: "不支持的操作: " + action },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}