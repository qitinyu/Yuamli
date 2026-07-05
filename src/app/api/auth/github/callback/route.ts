import { NextRequest, NextResponse } from "next/server";
import { getUserByGithubId, addUser, updateUser } from "@/lib/storage";
import { attachSessionToResponse } from "@/lib/auth";

// GitHub OAuth callback — fully server-side: exchange code, set cookie, redirect
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Detect popup mode from cookie (set by AuthModal before window.open)
  const popupCookie = request.cookies.get("yuamli_popup");
  const isPopup = popupCookie?.value === "1";

  if (error) {
    const errorMsg = decodeURIComponent(error);
    if (isPopup) {
      return new NextResponse(popupHtml("error", errorMsg), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
        },
      });
    }
    return NextResponse.redirect(
      new URL("/?github_error=" + encodeURIComponent(error), request.url)
    );
  }

  if (!code) {
    if (isPopup) {
      return new NextResponse(popupHtml("error", "no_code"), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
        },
      });
    }
    return NextResponse.redirect(
      new URL("/?github_error=no_code", request.url)
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const msg = "GitHub OAuth 未配置，请设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET 环境变量";
    if (isPopup) {
      return new NextResponse(popupHtml("error", msg), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
        },
      });
    }
    return NextResponse.redirect(
      new URL("/?github_error=" + encodeURIComponent(msg), request.url)
    );
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error_description || tokenData.error || "授权失败";
      if (isPopup) {
        return new NextResponse(popupHtml("error", msg), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
          },
        });
      }
      return NextResponse.redirect(
        new URL("/?github_error=" + encodeURIComponent(msg), request.url)
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      if (isPopup) {
        return new NextResponse(popupHtml("error", "未获取到 Access Token"), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
          },
        });
      }
      return NextResponse.redirect(
        new URL(
          "/?github_error=" + encodeURIComponent("未获取到 Access Token"),
          request.url
        )
      );
    }

    // Step 2: Get GitHub user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      if (isPopup) {
        return new NextResponse(popupHtml("error", "获取用户信息失败"), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
          },
        });
      }
      return NextResponse.redirect(
        new URL(
          "/?github_error=" + encodeURIComponent("获取用户信息失败"),
          request.url
        )
      );
    }

    const ghUser = await userRes.json();
    const githubId = "gh_" + ghUser.id;
    const now = new Date().toISOString();

    // Step 3: Find or create local user
    let user = await getUserByGithubId(githubId);

    if (!user) {
      user = {
        id: githubId,
        name: ghUser.login || "GitHub User",
        email: ghUser.email || "",
        avatar: ghUser.avatar_url || "",
        type: "github" as const,
        createdAt: now,
      };
      await addUser(user);
    } else if (ghUser.avatar_url && user.avatar !== ghUser.avatar_url) {
      await updateUser(githubId, {
        avatar: ghUser.avatar_url,
        ...(ghUser.login ? { name: ghUser.login } : {}),
      });
      user.avatar = ghUser.avatar_url;
      if (ghUser.login) user.name = ghUser.login;
    }

    // Step 4: Build response
    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };

    const verifyToken = Buffer.from(
      JSON.stringify({ tid: githubId, ts: Date.now() })
    ).toString("base64url");

    if (isPopup) {
      // Popup mode: return HTML that broadcasts via BroadcastChannel, then closes
      const html = popupHtml("success", user.name, verifyToken);
      const response = new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
        },
      });
      // Set cookie so the session is available when the parent page re-fetches
      attachSessionToResponse(response, sessionUser);
      // Also set verification cookie
      response.cookies.set("yuamli_gh_verify", verifyToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30,
        path: "/",
      });
      return response;
    }

    // Normal mode: redirect with query params (original behavior)
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("github_login", "success");
    redirectUrl.searchParams.set("gh_name", encodeURIComponent(sessionUser.name));

    const response = NextResponse.redirect(redirectUrl);
    attachSessionToResponse(response, sessionUser);
    response.cookies.set("yuamli_gh_verify", verifyToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30,
      path: "/",
    });

    return response;
  } catch {
    if (isPopup) {
      return new NextResponse(popupHtml("error", "登录失败，请重试"), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": "yuamli_popup=; path=/; max-age=0",
        },
      });
    }
    return NextResponse.redirect(
      new URL(
        "/?github_error=" + encodeURIComponent("登录失败，请重试"),
        request.url
      )
    );
  }
}

/** Generate HTML page for popup OAuth flow — uses BroadcastChannel to notify parent */
function popupHtml(status: "success" | "error", name: string, token?: string): string {
  const payload = JSON.stringify({ status, name, token: token || "" });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GitHub 登录</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
  .box { text-align: center; padding: 2rem; }
  .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .msg { color: #44403c; font-size: 0.95rem; }
</style></head><body>
<div class="box">
  <div class="icon">${status === "success" ? "&#10003;" : "&#10007;"}</div>
  <div class="msg">${status === "success" ? `登录成功，欢迎 ${name}` : `登录失败: ${name}`}</div>
</div>
<script>
(function() {
  var payload = ${payload};
  try {
    var bc = new BroadcastChannel('yuamli-auth');
    bc.postMessage(payload);
    bc.close();
  } catch(e) {}
  // Also try postMessage for iframe parent
  try {
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'yuamli-auth', data: payload }, '*');
    }
  } catch(e) {}
  setTimeout(function() { window.close(); }, 1200);
})();
</script>
</body></html>`;
}