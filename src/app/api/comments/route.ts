import { NextRequest, NextResponse } from "next/server";
import { getComments, buildCommentTree, addComment, getConfig, type Comment } from "@/lib/storage";
import { sendNotifyEmail, buildNotifyHtml } from "@/lib/email";

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

    const saved = await addComment(comment);

    // --- Send email notification (fire-and-forget, non-blocking) ---
    sendNotification(comment).catch((err) => {
      console.error("[notify] Background email failed:", err.message || err);
    });

    return NextResponse.json({ ok: true, comment: saved });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Background: send email notification if enabled and configured.
 * This runs after the comment response is sent — non-blocking.
 */
async function sendNotification(comment: Comment): Promise<void> {
  try {
    const config = await getConfig();

    if (!config.notifyEnabled) return;
    if (!config.adminEmail) return;
    if (!config.smtpUser || !config.smtpPass || !config.smtpHost) return;

    const timeStr = new Date(comment.createdAt).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    });

    const html = buildNotifyHtml(config.notifyTemplate || "", {
      author: comment.author.name,
      content: comment.content,
      time: timeStr,
      siteName: config.siteName,
    });

    const replyInfo = comment.replyTo
      ? ` (回复 ${comment.replyTo.name})`
      : "";

    await sendNotifyEmail({
      smtpConfig: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort || 465,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
      },
      to: config.adminEmail,
      subject: `[${config.siteName}] 新留言${replyInfo} - ${comment.author.name}`,
      html,
    });
  } catch (err) {
    // Silent failure — email notification should never block the main flow
    console.error("[notify] sendNotification error:", err);
  }
}