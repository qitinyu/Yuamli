import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, isOAuthProvider } from "@/lib/oauth";

/**
 * GET /api/auth/{provider}[?mode=login|admin|bind]
 * Redirects to the provider's authorize page.
 * mode is carried through the OAuth `state` param back to the callback.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isOAuthProvider(provider)) {
    return NextResponse.json(
      { ok: false, error: "不支持的登录方式" },
      { status: 404 }
    );
  }

  const origin = request.nextUrl.origin;
  const modeParam = request.nextUrl.searchParams.get("mode");
  const state = modeParam === "admin" || modeParam === "bind" ? modeParam : "login";

  const url = buildAuthorizeUrl(provider, origin, state);
  if (!url) {
    return NextResponse.json(
      { ok: false, error: `${provider} OAuth 未配置` },
      { status: 500 }
    );
  }

  return NextResponse.redirect(url);
}
