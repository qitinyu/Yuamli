import { NextRequest, NextResponse } from "next/server";
import { isOAuthProvider, oauthLogin } from "@/lib/oauth";
import {
  attachAdminToResponse,
  attachSessionToResponse,
  isAdminAuthenticated,
} from "@/lib/auth";
import { getConfig, updateConfig } from "@/lib/storage";

/**
 * OAuth callback for all providers.
 *
 * Modes (carried via `state`):
 *  - login (default): set session cookie, return popup-friendly HTML
 *  - admin           : set session + admin cookie if the account matches the
 *                      bound admin identity, then redirect to /admin
 *  - bind            : bind the OAuth account as the admin identity
 *                      (requires an existing admin cookie), then redirect to /admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "login";
  const origin = new URL(request.url).origin;

  const providerLabel =
    provider === "github"
      ? "GitHub"
      : provider === "gitee"
        ? "Gitee"
        : provider === "gitcode"
          ? "GitCode"
          : provider === "qq"
            ? "QQ"
            : provider;

  if (!isOAuthProvider(provider)) {
    return htmlResponse(messagePage("无效的登录方式", "/", 0));
  }

  if (error) {
    return finishWithError(state, `${providerLabel} 授权失败: ${decodeURIComponent(error)}`);
  }
  if (!code) {
    return finishWithError(state, "缺少授权码");
  }

  const result = await oauthLogin(provider, code, origin);
  if (!result.ok) {
    return finishWithError(state, `${providerLabel} ${result.error}`);
  }

  const user = result.user;
  const sessionUser = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    type: user.type,
    email: user.email,
  };

  // ===== bind mode: bind current OAuth account as admin identity =====
  if (state === "bind") {
    if (!(await isAdminAuthenticated())) {
      return htmlResponse(
        messagePage("未授权：请先使用管理密码登录后台", "/admin?oauth_error=" + encodeURIComponent("请先使用管理密码登录后台"), 1500)
      );
    }
    await updateConfig({
      adminIdentity: { id: user.id, name: user.name, avatar: user.avatar, type: provider },
    });
    return htmlResponse(
      messagePage(`绑定成功，已将 ${user.name} 设为管理员身份`, "/admin?bound=1", 800)
    );
  }

  // ===== admin mode: log into the admin panel with the bound identity =====
  if (state === "admin") {
    const config = await getConfig();
    if (!config.adminIdentity || config.adminIdentity.id !== user.id) {
      return htmlResponse(
        messagePage(
          "该账号未绑定管理员身份",
          "/admin?oauth_error=" + encodeURIComponent("该账号未绑定管理员身份，请先用密码登录并在设置中绑定"),
          1800
        )
      );
    }
    const response = htmlResponse(
      messagePage(`欢迎回来，${user.name}，正在进入后台...`, "/admin", 600)
    );
    attachSessionToResponse(response, sessionUser);
    attachAdminToResponse(response);
    return response;
  }

  // ===== login mode (default): normal site login =====
  const response = htmlResponse(
    loginCallbackHtml("success", user.name, "", providerLabel)
  );
  attachSessionToResponse(response, sessionUser);
  return response;
}

function finishWithError(state: string, message: string) {
  if (state === "admin" || state === "bind") {
    return htmlResponse(
      messagePage(message, "/admin?oauth_error=" + encodeURIComponent(message), 1800)
    );
  }
  return htmlResponse(loginCallbackHtml("error", "", message, ""));
}

function htmlResponse(html: string): NextResponse {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Simple centered message page that auto-redirects. */
function messagePage(message: string, redirectUrl: string, delayMs: number): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>登录</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .box{text-align:center;padding:2rem}
  .msg{color:#44403c;font-size:.95rem}
</style></head><body>
<div class="box"><div class="msg">${escapeHtml(message)}</div></div>
<script>
  setTimeout(function(){ window.location.replace(${JSON.stringify(redirectUrl)}); }, ${delayMs});
</script>
</body></html>`;
}

/**
 * Client-side HTML that auto-detects popup vs direct navigation.
 * - Popup: broadcast via BroadcastChannel + postMessage, then close
 * - Direct: redirect to main page
 */
function loginCallbackHtml(
  status: "success" | "error",
  name: string,
  error: string,
  providerLabel: string
): string {
  const payload = JSON.stringify({ status, name, error, provider: providerLabel });
  const redirectUrl =
    status === "success"
      ? "/?oauth_login=success&name=" + encodeURIComponent(name)
      : "/?oauth_error=" + encodeURIComponent(error || name);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>登录</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .box{text-align:center;padding:2rem}
  .icon{font-size:2.5rem;margin-bottom:.5rem}
  .msg{color:#44403c;font-size:.95rem}
</style></head><body>
<div class="box">
  <div class="icon">${status === "success" ? "&#10003;" : "&#10007;"}</div>
  <div class="msg">${status === "success" ? escapeHtml(`登录成功，欢迎 ${name}`) : escapeHtml(`登录失败: ${error || name}`)}</div>
</div>
<script>
(function(){
  var payload = ${payload};
  var isPopup = window.opener && window.opener !== window;
  if (isPopup) {
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
    window.location.replace("${redirectUrl}");
  }
})();
</script>
</body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
