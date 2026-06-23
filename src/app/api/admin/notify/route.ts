import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/storage";
import { isAdminAuthenticated } from "@/lib/auth";

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
    const { email, enabled, template } = body;

    const updates: Record<string, unknown> = {};
    if (email !== undefined) updates.adminEmail = email;
    if (enabled !== undefined && typeof enabled === "boolean")
      updates.notifyEnabled = enabled;
    if (template !== undefined) updates.notifyTemplate = template;

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
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}