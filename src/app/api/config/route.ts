import { NextResponse } from "next/server";
import { getConfig } from "@/lib/storage";

export async function GET() {
  try {
    const config = await getConfig();
    // Only expose public-safe fields
    return NextResponse.json({
      siteName: config.siteName,
      footerHtml: config.footerHtml || "",
      replyPresets: config.replyPresets || [],
      themePreset: config.themePreset || "",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}