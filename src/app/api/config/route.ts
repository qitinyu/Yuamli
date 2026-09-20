import { NextResponse } from "next/server";
import { getConfig } from "@/lib/storage";
import { getEnabledProviders } from "@/lib/oauth";

export async function GET() {
  try {
    const config = await getConfig();
    // Only expose public-safe fields
    return NextResponse.json({
      siteName: config.siteName,
      footerHtml: config.footerHtml || "",
      replyPresets: config.replyPresets || [],
      themePreset: config.themePreset || "",
      commentPlaceholder: config.commentPlaceholder || "",
      // enabled OAuth providers (github/gitee/gitcode/qq)
      oauthProviders: getEnabledProviders(),
      // author id that should render with a 站长 badge (bound identity or legacy "admin")
      adminAuthorId: config.adminIdentity?.id || "admin",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
