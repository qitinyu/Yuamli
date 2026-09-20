import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { getConfig, getEmailCode, setEmailCode, deleteEmailCode } from "@/lib/storage";
import { sendNotifyEmail } from "@/lib/email";

/**
 * POST /api/auth/email/send  { email }
 * Sends a 6-digit login verification code via the admin-configured SMTP server.
 * Rate-limited to one code per email per 60s; codes expire after 10 minutes.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_INTERVAL = 60 * 1000;
const CODE_TTL = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    const config = await getConfig();
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      return NextResponse.json(
        { ok: false, error: "邮箱登录未启用：管理员尚未在后台配置邮件服务（SMTP）" },
        { status: 503 }
      );
    }

    const existing = await getEmailCode(email);
    if (existing && Date.now() - existing.sentAt < RESEND_INTERVAL) {
      const wait = Math.ceil((RESEND_INTERVAL - (Date.now() - existing.sentAt)) / 1000);
      return NextResponse.json(
        { ok: false, error: `发送过于频繁，请 ${wait} 秒后重试` },
        { status: 429 }
      );
    }

    const code = String(randomInt(100000, 999999));
    await setEmailCode(email, {
      code,
      expiresAt: Date.now() + CODE_TTL,
      sentAt: Date.now(),
      attempts: 0,
    });

    const result = await sendNotifyEmail({
      smtpConfig: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort || 465,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
      },
      to: email,
      subject: `【${config.siteName}】登录验证码`,
      html: buildCodeHtml(code, config.siteName),
      fromName: config.siteName,
    });

    if (!result.ok) {
      await deleteEmailCode(email);
      console.error("[email-login] Verification code send failed:", result.message);
      return NextResponse.json(
        { ok: false, error: "邮件发送失败，请稍后重试" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "发送失败，请重试" },
      { status: 500 }
    );
  }
}

function buildCodeHtml(code: string, siteName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background: #fafafa;">
    <h2 style="margin-top:0; color: #059669; font-size: 18px;">✉️ ${siteName} 登录验证码</h2>
    <p style="font-size: 14px; line-height: 1.6;">您好，您正在登录 <b>${siteName}</b>，验证码为：</p>
    <div style="text-align: center; margin: 16px 0;">
      <span style="display: inline-block; font-size: 30px; font-weight: bold; letter-spacing: 8px; color: #059669; background: #ecfdf5; border: 1px dashed #059669; border-radius: 8px; padding: 12px 20px;">${code}</span>
    </div>
    <p style="font-size: 14px; line-height: 1.6;">验证码 10 分钟内有效。如非本人操作，请忽略此邮件。</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
    <p style="margin:0; font-size: 12px; color: #9ca3af;">此邮件由 ${siteName} 留言板系统自动发送，请勿回复</p>
  </div>
</body>
</html>`;
}
