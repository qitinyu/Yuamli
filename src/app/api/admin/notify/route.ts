import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/storage";
import { isAdminAuthenticated, adminUnauthorized } from "@/lib/auth";
import { verifySmtp, sendNotifyEmail, isMaskedPass, SMTP_PASS_MASK } from "@/lib/email";
import { normalizeCommentExpand } from "@/lib/comment-expand";

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) return adminUnauthorized();

    const body = await request.json();
    const { action } = body;

    // Test SMTP connection
    if (action === "test") {
      const { smtpHost, smtpPort, smtpUser, smtpPass, testEmail } = body;
      if (!smtpUser) {
        return NextResponse.json({ ok: false, message: "请先填写 SMTP 账号" });
      }
      // 前端回显的是掩码，说明用户没重新输入授权码 —— 用库里已保存的那份
      const savedPass = (await getConfig()).smtpPass || "";
      const pass = isMaskedPass(smtpPass) ? savedPass : smtpPass;
      if (!pass) {
        return NextResponse.json({ ok: false, message: "请先填写 SMTP 授权码" });
      }
      const to = testEmail || body.email;
      if (!to) {
        return NextResponse.json({ ok: false, message: "请填写收件邮箱" });
      }

      const smtpConfig = { smtpHost, smtpPort: Number(smtpPort), smtpUser, smtpPass: pass };

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
    const { email, enabled, template, smtpHost, smtpPort, smtpUser, smtpPass, footerHtml, replyPresets, themePreset, commentPlaceholder, commentExpand } = body;
    const updates: Record<string, unknown> = {};
    if (email !== undefined) updates.adminEmail = email;
    if (enabled !== undefined && typeof enabled === "boolean") updates.notifyEnabled = enabled;
    if (template !== undefined) updates.notifyTemplate = template;
    if (smtpHost !== undefined) updates.smtpHost = smtpHost;
    if (smtpPort !== undefined) updates.smtpPort = Number(smtpPort);
    if (smtpUser !== undefined) updates.smtpUser = smtpUser;
    // 掩码代表「未改动」，不能把它当成新授权码写回数据库
    if (smtpPass !== undefined && !isMaskedPass(smtpPass)) updates.smtpPass = smtpPass;
    if (footerHtml !== undefined) updates.footerHtml = footerHtml;
    if (replyPresets !== undefined && Array.isArray(replyPresets)) updates.replyPresets = replyPresets;
    if (themePreset !== undefined && typeof themePreset === "string") updates.themePreset = themePreset;
    if (commentPlaceholder !== undefined && typeof commentPlaceholder === "string") updates.commentPlaceholder = commentPlaceholder;
    if (commentExpand !== undefined && typeof commentExpand === "object" && commentExpand) {
      updates.commentExpand = normalizeCommentExpand(commentExpand);
    }

    let newConfig;
    try {
      newConfig = await updateConfig(updates as any);
    } catch (err: any) {
      const raw = err?.message || String(err);
      return NextResponse.json(
        {
          ok: false,
          message:
            `配置写入失败：${raw}\n` +
            `（Vercel 的文件系统是只读的，需要在 Storage 中创建 KV 实例并关联项目；` +
            `自建服务器请检查 data 目录的写权限）`,
        },
        { status: 500 }
      );
    }

    // 不要把密码与授权码回传给前端
    return NextResponse.json({
      ok: true,
      config: {
        ...newConfig,
        adminPassword: "******",
        smtpPass: newConfig.smtpPass ? SMTP_PASS_MASK : "",
      },
    });
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
      smtpPass: config.smtpPass ? SMTP_PASS_MASK : "",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}