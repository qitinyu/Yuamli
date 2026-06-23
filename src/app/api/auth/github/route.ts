import { NextRequest, NextResponse } from "next/server";
import { getUserByGithubId, addUser } from "@/lib/storage";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { ok: false, error: "GitHub code is required" },
        { status: 400 }
      );
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { ok: false, error: "GitHub OAuth 未配置，请在 .env 中设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET" },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { ok: false, error: "GitHub 授权失败: " + (tokenData.error_description || tokenData.error) },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "未获取到 GitHub Access Token" },
        { status: 401 }
      );
    }

    // Step 2: Get GitHub user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.json(
        { ok: false, error: "获取 GitHub 用户信息失败" },
        { status: 401 }
      );
    }

    const ghUser = await userRes.json();
    const githubId = "gh_" + ghUser.id;
    const now = new Date().toISOString();

    // Step 3: Find or create local user
    let user = getUserByGithubId(githubId);

    if (!user) {
      user = {
        id: githubId,
        name: ghUser.login || "GitHub User",
        email: ghUser.email || "",
        avatar: ghUser.avatar_url || "",
        type: "github" as const,
        createdAt: now,
      };
      addUser(user);
    }

    // Step 4: Create session
    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };

    await createSession(sessionUser);

    return NextResponse.json({ ok: true, user: sessionUser });
  } catch {
    return NextResponse.json(
      { ok: false, error: "GitHub 登录失败，请重试" },
      { status: 500 }
    );
  }
}