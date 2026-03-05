import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // encoded returnTo

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_cancelled", request.url));
  }

  try {
    // Exchange code for GitHub access token (server-side — client_secret stays secret)
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // Get GitHub user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
    });
    const githubUser = await userRes.json();

    // Get primary verified email (may not be public on profile)
    let email: string = githubUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
      });
      const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email ?? "";
    }

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", request.url));
    }

    // Call our backend's oauth callback endpoint
    const backendRes = await fetch(`${API_BASE}/auth/oauth/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        providerId: String(githubUser.id),
        email,
        name: githubUser.name || githubUser.login,
      }),
    });
    const backendData = await backendRes.json();

    if (!backendRes.ok || !backendData.data?.accessToken) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // Pass token + user to the client via oauth-success page (sets localStorage)
    const returnTo = state ? decodeURIComponent(state) : "/dashboard";
    const params = new URLSearchParams({
      token: backendData.data.accessToken,
      user: JSON.stringify(backendData.data.user),
      returnTo,
    });

    return NextResponse.redirect(new URL(`/oauth-success?${params.toString()}`, origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
