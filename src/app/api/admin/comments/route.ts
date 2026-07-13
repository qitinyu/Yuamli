import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getComments,
  addComment,
  batchDeleteComments,
  batchUpdateComments,
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

    const comments = await getComments();
    comments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ comments });
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
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, message: "缺少操作类型或留言ID" },
        { status: 400 }
      );
    }

    switch (action) {
      case "batch_delete": {
        const count = await batchDeleteComments(ids);
        return NextResponse.json({ ok: true, message: `已删除 ${count} 条留言` });
      }
      case "batch_pin": {
        const count = await batchUpdateComments(ids, { isPinned: true });
        return NextResponse.json({ ok: true, message: `已置顶 ${count} 条留言` });
      }
      case "batch_unpin": {
        const count = await batchUpdateComments(ids, { isPinned: false });
        return NextResponse.json({ ok: true, message: `已取消置顶 ${count} 条留言` });
      }
      case "batch_feature": {
        const count = await batchUpdateComments(ids, { isFeatured: true });
        return NextResponse.json({ ok: true, message: `已设为精华 ${count} 条留言` });
      }
      case "batch_unfeature": {
        const count = await batchUpdateComments(ids, { isFeatured: false });
        return NextResponse.json({ ok: true, message: `已取消精华 ${count} 条留言` });
      }
      case "unified_reply": {
        const { content } = body;
        if (!content || typeof content !== "string" || content.trim().length === 0) {
          return NextResponse.json(
            { ok: false, message: "回复内容不能为空" },
            { status: 400 }
          );
        }
        const now = new Date().toISOString();
        let count = 0;
        for (const parentId of ids) {
          const parent = await getComments().then(c => c.find(x => x.id === parentId));
          if (!parent) continue;
          await addComment({
            id: crypto.randomUUID(),
            content: content.trim(),
            author: {
              id: "admin",
              name: "管理员",
              avatar: "",
              type: "guest",
            },
            parentId: parentId,
            replyTo: { id: parent.author.id, name: parent.author.name },
            isPinned: false,
            isFeatured: false,
            pageId: parent.pageId || "",
            createdAt: now,
            updatedAt: now,
          });
          count++;
        }
        return NextResponse.json({ ok: true, message: `已统一回复 ${count} 条留言` });
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