import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/storage";
import { isAdminAuthenticated } from "@/lib/auth";
import { verifySmtp, sendNotifyEmail, buildNotifyHtml } from "@/lib/email";

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
    const { email, enabled, template, smtpHost, smtpPort, smtpUser, smtpPass, action } = body;

    // Handle "test" action — send a test email
    if (action === "test") {
      const config = await getConfig();
      const host = smtpHost || config.smtpHost;
      const port = smtpPort || config.smtpPort;
      const user = smtpUser || config.smtpUser;
      const pass = smtpPass || config.smtpPass;
      const to = email || config.adminEmail;

      if (!host || !user || !pass || !to) {
        return NextResponse.json(
          { ok: false, message: "请先完整填写 SMTP 配置和站长邮箱" },
          { status: 400 }
        );
      }

      // First verify connection
      const verifyResult = await verifySmtp({ smtpHost: host, smtpPort: port, smtpUser: user, smtpPass: pass });
      if (!verifyResult.ok) {
        return NextResponse.json({ ok: false, message: verifyResult.message });
      }

      // Send test email
      const testHtml = buildNotifyHtml(
        config.notifyTemplate,
        {
          author: "测试用户",
          content: "这是一条测试留言，用于验证邮件通知功能是否正常工作。",
          time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
          siteName: config.siteName,
        }
      );

      const sendResult = await sendNotifyEmail({
        smtpConfig: { smtpHost: host, smtpPort: port, smtpUser: user, smtpPass: pass },
        to,
        subject: `[${config.siteName}] 测试通知 - 邮件配置验证`,
        html: testHtml,
      });

      return NextResponse.json(sendResult);
    }

    // Normal save action
    const updates: Record<string, unknown> = {};
    if (email !== undefined) updates.adminEmail = email;
    if (enabled !== undefined && typeof enabled === "boolean") updates.notifyEnabled = enabled;
    if (template !== undefined) updates.notifyTemplate = template;
    if (smtpHost !== undefined) updates.smtpHost = smtpHost;
    if (smtpPort !== undefined) updates.smtpPort = Number(smtpPort);
    if (smtpUser !== undefined) updates.smtpUser = smtpUser;
    if (smtpPass !== undefined) updates.smtpPass = smtpPass;

    const newConfig = await updateConfig(updates as any);

    return NextResponse.json({ ok: true, config: newConfig });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
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
      // Never expose the actual password to the frontend
      smtpPass: config.smtpPass ? "********" : "",
      smtpConfigured: !!(config.smtpUser && config.smtpPass),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}