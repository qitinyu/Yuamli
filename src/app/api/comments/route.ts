import { NextRequest, NextResponse } from "next/server";
import { getComments, buildCommentTree, type Comment } from "@/lib/storage";

export async function GET() {
  try {
    const allComments = await getComments();

    // Build recursive tree
    const tree = buildCommentTree(allComments, null);

    // Sort top-level: pinned first, then by createdAt desc
    tree.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      comments: tree,
      total: allComments.length,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, parentId, replyTo } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "Comment content is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const comment: Comment = {
      id: crypto.randomUUID(),
      content: content.trim(),
      author: {
        id: session.id,
        name: session.name,
        avatar: session.avatar,
        type: session.type,
      },
      parentId: parentId || null,
      replyTo: replyTo ? { id: replyTo.id, name: replyTo.name } : null,
      isPinned: false,
      isFeatured: false,
      createdAt: now,
      updatedAt: now,
    };

    const { addComment } = await import("@/lib/storage");
    const saved = await addComment(comment);

    return NextResponse.json({ ok: true, comment: saved });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}