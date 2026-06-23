import { NextRequest, NextResponse } from "next/server";
import { getUserByGithubId, addUser, updateUser } from "@/lib/storage";
import { createSession } from "@/lib/auth";

// GitHub OAuth callback — fully server-side: exchange code, set cookie, redirect
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/?github_error=" + encodeURIComponent(error), request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?github_error=no_code", request.url)
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/?github_error=" +
          encodeURIComponent(
            "GitHub OAuth 未配置，请设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET 环境变量"
          ),
        request.url
      )
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
      return NextResponse.redirect(
        new URL(
          "/?github_error=" +
            encodeURIComponent(
              tokenData.error_description || tokenData.error || "授权失败"
            ),
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
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

    // Step 4: Set session cookie on redirect response
    const sessionUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      type: user.type,
      email: user.email,
    };

    const sessionData = JSON.stringify(sessionUser);
    const encoded = Buffer.from(sessionData).toString("base64");

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("github_login", "success");
    redirectUrl.searchParams.set("gh_name", encodeURIComponent(sessionUser.name));

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("yuamli_session", encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(
        "/?github_error=" + encodeURIComponent("登录失败，请重试"),
        request.url
      )
    );
  }
}