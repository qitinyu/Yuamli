/**
 * Unified OAuth module for GitHub / Gitee / GitCode / QQ
 *
 * Flow (authorization code):
 *   1. GET /api/auth/{provider}[?mode=login|admin|bind]  → redirect to provider authorize URL
 *   2. Provider redirects to /api/auth/{provider}/callback?code=...&state=...
 *   3. Callback exchanges code for token, fetches profile, upserts user, sets session cookie
 *
 * Required env vars:
 *   GitHub : GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 *   Gitee  : GITEE_CLIENT_ID / GITEE_CLIENT_SECRET
 *   GitCode: GITCODE_CLIENT_ID / GITCODE_CLIENT_SECRET
 *   QQ     : QQ_APP_ID / QQ_APP_KEY
 */

import { addUser, getUserByOAuthId, updateUser, type OAuthType, type User } from "./storage";

export type { OAuthType };

const OAUTH_PROVIDERS: OAuthType[] = ["github", "gitee", "gitcode", "qq"];

export function isOAuthProvider(value: string): value is OAuthType {
  return (OAUTH_PROVIDERS as string[]).includes(value);
}

interface Credentials {
  clientId: string;
  clientSecret: string;
}

export function getProviderCredentials(provider: OAuthType): Credentials | null {
  switch (provider) {
    case "github":
      return process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }
        : null;
    case "gitee":
      return process.env.GITEE_CLIENT_ID && process.env.GITEE_CLIENT_SECRET
        ? { clientId: process.env.GITEE_CLIENT_ID, clientSecret: process.env.GITEE_CLIENT_SECRET }
        : null;
    case "gitcode":
      return process.env.GITCODE_CLIENT_ID && process.env.GITCODE_CLIENT_SECRET
        ? { clientId: process.env.GITCODE_CLIENT_ID, clientSecret: process.env.GITCODE_CLIENT_SECRET }
        : null;
    case "qq":
      return process.env.QQ_APP_ID && process.env.QQ_APP_KEY
        ? { clientId: process.env.QQ_APP_ID, clientSecret: process.env.QQ_APP_KEY }
        : null;
  }
}

/** Providers that have credentials configured (server env) */
export function getEnabledProviders(): OAuthType[] {
  return OAUTH_PROVIDERS.filter((p) => getProviderCredentials(p) !== null);
}

export function callbackUrl(provider: OAuthType, origin: string): string {
  return `${origin}/api/auth/${provider}/callback`;
}

/** Build the provider authorize URL. Returns null when provider not configured. */
export function buildAuthorizeUrl(
  provider: OAuthType,
  origin: string,
  state: string
): string | null {
  const cred = getProviderCredentials(provider);
  if (!cred) return null;
  const redirectUri = encodeURIComponent(callbackUrl(provider, origin));

  switch (provider) {
    case "github":
      return `https://github.com/login/oauth/authorize?client_id=${cred.clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent("user:email read:user")}&state=${encodeURIComponent(state)}`;
    case "gitee":
      return `https://gitee.com/oauth/authorize?client_id=${cred.clientId}&redirect_uri=${redirectUri}&response_type=code&state=${encodeURIComponent(state)}`;
    case "gitcode":
      return `https://gitcode.com/oauth/authorize?client_id=${cred.clientId}&redirect_uri=${redirectUri}&response_type=code&state=${encodeURIComponent(state)}`;
    case "qq":
      return `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${cred.clientId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}`;
  }
}

interface OAuthToken {
  accessToken: string;
  openid?: string;
}

async function exchangeToken(
  provider: OAuthType,
  code: string,
  origin: string
): Promise<OAuthToken> {
  const cred = getProviderCredentials(provider);
  if (!cred) throw new Error("OAuth 未配置");
  const redirectUri = callbackUrl(provider, origin);

  if (provider === "github") {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.error || "授权失败");
    }
    if (!data.access_token) throw new Error("未获取到 Access Token");
    return { accessToken: data.access_token };
  }

  if (provider === "gitee" || provider === "gitcode") {
    const host = provider === "gitee" ? "https://gitee.com" : "https://gitcode.com";
    const res = await fetch(`${host}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.error || "授权失败");
    }
    if (!data.access_token) throw new Error("未获取到 Access Token");
    return { accessToken: data.access_token };
  }

  // QQ Connect
  const tokenRes = await fetch(
    `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${cred.clientId}&client_secret=${cred.clientSecret}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}&fmt=json`
  );
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error("QQ 授权失败");
  }
  const meRes = await fetch(
    `https://graph.qq.com/oauth2.0/me?access_token=${tokenData.access_token}&fmt=json`
  );
  const meData = await meRes.json();
  if (!meRes.ok || !meData.openid) {
    throw new Error("获取 QQ OpenID 失败");
  }
  return { accessToken: tokenData.access_token, openid: meData.openid };
}

interface OAuthProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

async function fetchProfile(
  provider: OAuthType,
  token: OAuthToken
): Promise<OAuthProfile> {
  if (provider === "github") {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) throw new Error("获取 GitHub 用户信息失败");
    const u = await res.json();
    return {
      id: "gh_" + u.id,
      name: u.login || "GitHub User",
      avatar: u.avatar_url || "",
      email: u.email || "",
    };
  }

  if (provider === "gitee" || provider === "gitcode") {
    const host = provider === "gitee" ? "https://gitee.com" : "https://gitcode.com";
    const res = await fetch(`${host}/api/v5/user?access_token=${token.accessToken}`);
    if (!res.ok) throw new Error("获取用户信息失败");
    const u = await res.json();
    const prefix = provider === "gitee" ? "gitee_" : "gc_";
    return {
      id: prefix + u.id,
      name: (u.name || u.login || `${provider} User`).slice(0, 20),
      avatar: u.avatar_url || "",
      email: u.email || "",
    };
  }

  // QQ Connect
  const cred = getProviderCredentials("qq");
  if (!cred || !token.openid) throw new Error("QQ 授权信息不完整");
  const res = await fetch(
    `https://graph.qq.com/user/get_user_info?access_token=${token.accessToken}&oauth_consumer_key=${cred.clientId}&openid=${token.openid}`
  );
  const u = await res.json();
  if (!res.ok || u.ret !== 0) {
    throw new Error("获取 QQ 用户信息失败");
  }
  return {
    id: "qq_" + token.openid,
    name: (u.nickname || "QQ 用户").slice(0, 20),
    avatar: u.figureurl_qq_2 || u.figureurl_qq_1 || "",
    email: "",
  };
}

export type OAuthLoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Full OAuth login: exchange code → fetch profile → upsert user.
 * Does NOT touch cookies (caller decides session/admin cookies).
 */
export async function oauthLogin(
  provider: OAuthType,
  code: string,
  origin: string
): Promise<OAuthLoginResult> {
  try {
    const token = await exchangeToken(provider, code, origin);
    const profile = await fetchProfile(provider, token);
    const now = new Date().toISOString();

    let user = await getUserByOAuthId(profile.id);
    if (!user) {
      user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        type: provider,
        createdAt: now,
      };
      await addUser(user);
    } else if (profile.avatar && user.avatar !== profile.avatar) {
      await updateUser(profile.id, {
        avatar: profile.avatar,
        ...(profile.name ? { name: profile.name } : {}),
      });
      user.avatar = profile.avatar;
      if (profile.name) user.name = profile.name;
    }

    return { ok: true, user };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "登录失败，请重试",
    };
  }
}
