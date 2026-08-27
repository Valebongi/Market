import { NextRequest, NextResponse } from "next/server";
import { safeReturnTo } from "@/lib/security";
import {
  encodeOAuthHandoff,
  parseOAuthState,
  OAUTH_HANDOFF_COOKIE,
  OAUTH_HANDOFF_MAX_AGE,
  OAUTH_HANDOFF_PATH,
} from "@/components/auth/oauth-handoff";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * Callback del OAuth de GitHub. Corre en el servidor porque el
 * `client_secret` no puede salir de acá.
 *
 * Ver `components/auth/oauth-handoff.ts` para el porqué del `state` y de la
 * cookie: en resumen, el `state` dejó de ser un `returnTo` disfrazado y pasó a
 * ser el nonce que ata el flujo a la pestaña que lo inició, y la sesión ya no
 * viaja por querystring.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_cancelled", origin));
  }

  /**
   * Sin `state` parseable no seguimos. Ese es el corte que convierte al
   * callback en algo que solo se puede completar desde nuestro propio botón:
   * un `code` conseguido por fuera (CSRF de login) llega sin nonce y muere acá,
   * antes de gastar el `client_secret` contra GitHub.
   */
  const state = parseOAuthState(searchParams.get("state"));
  if (!state) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", origin));
  }

  // El `returnTo` lo controla quien arma el link: se normaliza a ruta interna
  // acá y NO se vuelve a confiar en él más adelante.
  const returnTo = safeReturnTo(state.returnTo);

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
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
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
      return NextResponse.redirect(new URL("/login?error=no_email", origin));
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
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
    }

    /**
     * La sesión se le entrega al cliente por cookie, no por querystring.
     *
     * - `httpOnly: false` es deliberado: `/oauth-success` tiene que leerla para
     *   moverla a `localStorage`, que es donde vive la sesión en esta app.
     *   No pierde nada frente al estado anterior — el token terminaba igual en
     *   `localStorage` — y sí saca al token de la URL, del historial, del
     *   `Referer` y de los logs de cualquier proxy intermedio.
     * - `path` acotado: no se manda en ninguna otra request del sitio.
     * - `maxAge` corto y borrado apenas se consume: es de un solo uso.
     * - Lo importante: un tercero **no puede escribir cookies de nuestro
     *   origen**, así que un link fabricado ya no puede inyectar una sesión.
     */
    const response = NextResponse.redirect(new URL(OAUTH_HANDOFF_PATH, origin));
    response.cookies.set({
      name: OAUTH_HANDOFF_COOKIE,
      value: encodeOAuthHandoff({
        nonce: state.nonce,
        accessToken: backendData.data.accessToken,
        user: backendData.data.user,
        returnTo,
      }),
      httpOnly: false,
      // `lax` y no `strict`: la navegación final la origina un redirect de una
      // cadena que arrancó en github.com, y `strict` no mandaría la cookie.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: OAUTH_HANDOFF_PATH,
      maxAge: OAUTH_HANDOFF_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }
}
