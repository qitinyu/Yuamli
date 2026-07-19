import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/storage";
import { isAdminAuthenticated } from "@/lib/auth";
import { verifySmtp, sendNotifyEmail } from "@/lib/email";

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
    const { action } = body;

    // Test SMTP connection
    if (action === "test") {
      const { smtpHost, smtpPort, smtpUser, smtpPass, testEmail } = body;
      if (!smtpUser || !smtpPass) {
        return NextResponse.json({ ok: false, message: "请先填写 SMTP 用户名和授权码" });
      }
      const to = testEmail || body.email;
      if (!to) {
        return NextResponse.json({ ok: false, message: "请填写收件邮箱" });
      }

      const smtpConfig = { smtpHost, smtpPort: Number(smtpPort), smtpUser, smtpPass };

      // Verify first
      const verifyResult = await verifySmtp(smtpConfig);
      if (!verifyResult.ok) {
        return NextResponse.json({ ok: false, message: verifyResult.message });
      }

      // Send test email
      const config = await getConfig();
      const { buildNotifyHtml } = await import("@/lib/email");
      const html = buildNotifyHtml(config.notifyTemplate, {
        author: "测试用户",
        content: "这是一封测试邮件，如果您收到此邮件，说明 SMTP 配置正确。",
        time: new Date().toLocaleString("zh-CN"),
        siteName: config.siteName,
      });

      const result = await sendNotifyEmail({
        smtpConfig,
        to,
        subject: `【${config.siteName}】测试邮件 - SMTP 配置验证`,
        html,
      });

      return NextResponse.json(result);
    }

    // Save settings
    const { email, enabled, template, smtpHost, smtpPort, smtpUser, smtpPass, footerHtml, replyPresets, themePreset, commentPlaceholder } = body;
    const updates: Record<string, unknown> = {};
    if (email !== undefined) updates.adminEmail = email;
    if (enabled !== undefined && typeof enabled === "boolean") updates.notifyEnabled = enabled;
    if (template !== undefined) updates.notifyTemplate = template;
    if (smtpHost !== undefined) updates.smtpHost = smtpHost;
    if (smtpPort !== undefined) updates.smtpPort = Number(smtpPort);
    if (smtpUser !== undefined) updates.smtpUser = smtpUser;
    if (smtpPass !== undefined && smtpPass) updates.smtpPass = smtpPass;
    if (footerHtml !== undefined) updates.footerHtml = footerHtml;
    if (replyPresets !== undefined && Array.isArray(replyPresets)) updates.replyPresets = replyPresets;
    if (themePreset !== undefined && typeof themePreset === "string") updates.themePreset = themePreset;
    if (commentPlaceholder !== undefined && typeof commentPlaceholder === "string") updates.commentPlaceholder = commentPlaceholder;

    const newConfig = await updateConfig(updates as any);

    return NextResponse.json({ ok: true, config: newConfig });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const config = await getConfig();

    return NextResponse.json({
      adminEmail: config.adminEmail,
      notifyEnabled: config.notifyEnabled,
      notifyTemplate: config.notifyTemplate || "",
      smtpHost: config.smtpHost || "smtp.qq.com",
      smtpPort: config.smtpPort || 465,
      smtpUser: config.smtpUser || "",
      smtpPass: config.smtpPass ? "••••••••••••" : "",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}