import { NextRequest, NextResponse } from "next/server";
import { getCommentById, updateComment, deleteComment } from "@/lib/storage";
import { getSession, isAdminAuthenticated } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingComment = await getCommentById(id);
    if (!existingComment) {
      return NextResponse.json(
        { ok: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, isPinned, isFeatured } = body;

    const updates: Record<string, unknown> = {};

    if (content !== undefined) {
      const session = await getSession();
      const admin = await isAdminAuthenticated();
      if (!session && !admin) {
        return NextResponse.json(
          { ok: false, message: "Authentication required" },
          { status: 401 }
        );
      }
      if (!admin && session && existingComment.author.id !== session.id) {
        return NextResponse.json(
          { ok: false, message: "Only the comment author can edit content" },
          { status: 403 }
        );
      }
      if (typeof content === "string" && content.trim().length > 0) {
        updates.content = content.trim();
      }
    }

    if (isPinned !== undefined || isFeatured !== undefined) {
      const admin = await isAdminAuthenticated();
      if (!admin) {
        return NextResponse.json(
          { ok: false, message: "Admin authentication required" },
          { status: 403 }
        );
      }
      if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
      if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    }

    const updated = await updateComment(id, updates);
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, comment: updated });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getSession();
    const isAdmin = await isAdminAuthenticated();

    if (!session && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!isAdmin) {
      const existingComment = await getCommentById(id);
      if (!existingComment || existingComment.author.id !== session!.id) {
        return NextResponse.json(
          { ok: false, message: "You can only delete your own comments" },
          { status: 403 }
        );
      }
    }

    const deleted = await deleteComment(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}