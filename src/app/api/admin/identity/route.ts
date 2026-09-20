import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getConfig, updateConfig } from "@/lib/storage";

/**
 * Admin identity management.
 *
 * POST /api/admin/identity
 *   { action: "unbind" } — clear the bound admin identity
 *   (binding happens via OAuth callback with mode=bind, which requires the admin cookie)
 */
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
    if (body.action !== "unbind") {
      return NextResponse.json(
        { ok: false, message: "不支持的操作" },
        { status: 400 }
      );
    }

    const config = await getConfig();
    if (!config.adminIdentity) {
      return NextResponse.json(
        { ok: false, message: "尚未绑定管理员身份" },
        { status: 400 }
      );
    }

    await updateConfig({ adminIdentity: null });
    return NextResponse.json({ ok: true, message: "已解绑管理员身份" });
  } catch {
    return NextResponse.json(
      { ok: false, message: "操作失败" },
      { status: 500 }
    );
  }
}
