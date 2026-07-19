import { NextRequest, NextResponse } from "next/server";
import { getComments, buildCommentTree, addComment, type Comment } from "@/lib/storage";

// GET — public, same as /api/comments
export async function GET() {
  try {
    const allComments = await getComments();
    const tree = buildCommentTree(allComments, null);
    tree.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return NextResponse.json({ comments: tree, total: allComments.length });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST — guest comment (no auth required, just name)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, parentId, replyTo, pageId } = body;

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json(
        { ok: false, message: "昵称不能为空" },
        { status: 400 }
      );
    }
    if (name.trim().length > 20) {
      return NextResponse.json(
        { ok: false, message: "昵称不能超过20个字符" },
        { status: 400 }
      );
    }
    if (!content || typeof content !== "string" || content.trim().length < 1) {
      return NextResponse.json(
        { ok: false, message: "留言内容不能为空" },
        { status: 400 }
      );
    }
    if (content.trim().length > 2000) {
      return NextResponse.json(
        { ok: false, message: "留言内容不能超过2000个字符" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const guestId = "guest_" + crypto.randomUUID().slice(0, 8);

    const comment: Comment = {
      id: crypto.randomUUID(),
      content: content.trim(),
      author: {
        id: guestId,
        name: name.trim(),
        avatar: "",
        type: "guest",
      },
      parentId: parentId || null,
      replyTo: replyTo ? { id: replyTo.id, name: replyTo.name } : null,
      isPinned: false,
      isFeatured: false,
      pageId: pageId || "default",
      createdAt: now,
      updatedAt: now,
    };

    const saved = await addComment(comment);
    return NextResponse.json({ ok: true, comment: saved });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
