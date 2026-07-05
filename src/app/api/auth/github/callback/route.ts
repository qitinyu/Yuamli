import { NextRequest, NextResponse } from "next/server";
import { getUserByGithubId, addUser, updateUser } from "@/lib/storage";
import { attachSessionToResponse } from "@/lib/auth";

/**
 * GitHub OAuth callback
 *
 * IMPORTANT: Always returns HTML (never server-side redirect).
 * The HTML page detects client-side whether it was opened as a popup
 * (window.opener exists) and behaves accordingly:
 *   - Popup: broadcast via BroadcastChannel + postMessage, then close
 *   - Direct: redirect to /?github_login=success
 *
 * This avoids relying on cookies for popup detection, which breaks
 * when the comment system is embedded in a cross-origin iframe
 * (third-party cookies get blocked by the browser).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  let userName = "";
  let status: "success" | "error" = "error";
  let errorMsg = "";

  if (error) {
    errorMsg = decodeURIComponent(error);
    status = "error";
  } else if (!code) {
    errorMsg = "no_code";
    status = "error";
  } else {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      errorMsg = "GitHub OAuth 未配置";
      status = "error";
    } else {
      const result = await handleOAuth(code, clientId, clientSecret);
      if (result.ok) {
        status = "success";
        userName = result.name;
        // Set session cookie on the response
        attachSessionToResponse(result.response, result.user);
        const response = result.response;
        return response;
      } else {
        errorMsg = result.error;
        status = "error";
      }
    }
  }

  // Error path — return HTML page
  const html = callbackHtml(status, userName, errorMsg);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleOAuth(code: string, clientId: string, clientSecret: string) {
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return { ok: false as const, error: tokenData.error_description || tokenData.error || "授权失败" };
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) return { ok: false as const, error: "未获取到 Access Token" };

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return { ok: false as const, error: "获取用户信息失败" };

    const ghUser = await userRes.json();
    const githubId = "gh_" + ghUser.id;
    const now = new Date().toISOString();

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

    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };

    const html = callbackHtml("success", user.name, "");
    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    return { ok: true as const, name: user.name, user: sessionUser, response };
  } catch {
    return { ok: false as const, error: "登录失败，请重试" };
  }
}

/**
 * Client-side HTML that auto-detects popup vs direct navigation.
 * - If popup (window.opener exists): broadcast + postMessage + close
 * - If direct: redirect to /?github_login=success
 */
function callbackHtml(status: "success" | "error", name: string, error: string): string {
  const payload = JSON.stringify({ status, name, error });
  const redirectUrl = status === "success"
    ? "/?github_login=success&gh_name=" + encodeURIComponent(name)
    : "/?github_error=" + encodeURIComponent(error || name);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GitHub 登录</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .box{text-align:center;padding:2rem}
  .icon{font-size:2.5rem;margin-bottom:.5rem}
  .msg{color:#44403c;font-size:.95rem}
</style></head><body>
<div class="box">
  <div class="icon">${status === "success" ? "&#10003;" : "&#10007;"}</div>
  <div class="msg">${status === "success" ? ("登录成功，欢迎 " + name) : ("登录失败: " + (error || name))}</div>
</div>
<script>
(function(){
  var payload = ${payload};
  var isPopup = window.opener && window.opener !== window;
  if (isPopup) {
    // Popup mode: notify parent via BroadcastChannel + postMessage, then close
    try {
      var bc = new BroadcastChannel('yuamli-auth');
      bc.postMessage(payload);
      bc.close();
    } catch(e) {}
    try {
      window.opener.postMessage({ type: 'yuamli-auth', data: payload }, '*');
    } catch(e) {}
    setTimeout(function(){ window.close(); }, 1200);
  } else {
    // Direct navigation: redirect to main page
    window.location.replace("${redirectUrl}");
  }
})();
</script>
</body></html>`;
}