/**
 * Email Utility
 *
 * Sends notification emails via SMTP (e.g. QQ Mail with authorization code).
 * Uses nodemailer under the hood.
 */

import nodemailer from "nodemailer";

export interface SmtpConfig {
  smtpHost: string;     // e.g. "smtp.qq.com"
  smtpPort: number;     // e.g. 465 (SSL) or 587 (TLS)
  smtpUser: string;     // e.g. "123456789@qq.com"
  smtpPass: string;     // QQ mail authorization code (16-digit)
}

/**
 * Create a nodemailer transporter from SMTP config
 */
export function createTransporter(config: SmtpConfig) {
  const isSSL = config.smtpPort === 465;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: isSSL,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

/**
 * Verify SMTP connection works
 */
export async function verifySmtp(config: SmtpConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    return { ok: true, message: "SMTP 连接成功" };
  } catch (err: any) {
    return { ok: false, message: `SMTP 连接失败: ${err.message || String(err)}` };
  }
}

/**
 * Send a notification email
 */
export async function sendNotifyEmail(params: {
  smtpConfig: SmtpConfig;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = createTransporter(params.smtpConfig);
    const info = await transporter.sendMail({
      from: `"Yuamli 通知" <${params.smtpConfig.smtpUser}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log("[email] Notification sent:", info.messageId);
    return { ok: true, message: "邮件发送成功" };
  } catch (err: any) {
    console.error("[email] Send failed:", err.message || err);
    return { ok: false, message: `邮件发送失败: ${err.message || String(err)}` };
  }
}

/**
 * Build email HTML content from template + comment data
 */
export function buildNotifyHtml(
  template: string,
  vars: { author: string; content: string; time: string; siteName?: string }
): string {
  const text = template
    .replace(/\{author\}/g, escapeHtml(vars.author))
    .replace(/\{content\}/g, escapeHtml(vars.content))
    .replace(/\{time\}/g, escapeHtml(vars.time))
    .replace(/\{siteName\}/g, escapeHtml(vars.siteName || ""));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background: #fafafa;">
    <h2 style="margin-top:0; color: #059669; font-size: 18px;">📬 新留言通知</h2>
    <div style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${text}</div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
    <p style="margin:0; font-size: 12px; color: #9ca3af;">此邮件由 Yuamli 留言板系统自动发送</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}