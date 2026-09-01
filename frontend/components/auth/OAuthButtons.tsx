"use client";

import { useState } from "react";
import Script from "next/script";
import { Github, Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { describeOAuthError, exchangeGoogleCredential } from "./oauth-login";
import {
  createOAuthNonce,
  encodeOAuthState,
  GITHUB_LOGIN_ENABLED,
  OAUTH_NONCE_STORAGE_KEY,
} from "./oauth-handoff";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (callback?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

/**
 * El login con GitHub está apagado a propósito.
 *
 * `app/api/auth/github/callback/route.ts` le habla al mismo endpoint
 * (`/auth/oauth/callback`) con el shape viejo — `providerId` + `email` como
 * datos crudos — que es exactamente la falla que se acaba de cerrar: el
 * backend no puede distinguir nuestro route handler de cualquier otro cliente
 * que postee el email de otra persona. Con la verificación nueva ese body da
 * 400, y la ruta además sigue cerrada en el gateway, así que el flujo tampoco
 * funciona hoy en producción.
 *
 * Antes de esto el usuario hacía clic, se iba a github.com, volvía y aterrizaba
 * en `/login?error=oauth_failed` — un query param que la pantalla de login ni
 * muestra. O sea: viaje completo para terminar en la misma pantalla, sin
 * explicación. Es preferible no dejarlo arrancar y decirle por qué.
 *
 * Para reactivarlo: poner `GITHUB_LOGIN_ENABLED` en `true` una vez que el
 * callback de GitHub mande una credencial verificable (no un email
 * autoafirmado). La decisión de cómo hacerlo está pendiente del dueño del
 * producto.
 *
 * El flag vive en `./oauth-handoff` porque el route handler del callback lo
 * necesita también, y así no pueden quedar desincronizados.
 */

interface OAuthButtonsProps {
  returnTo?: string;
  mode?: "login" | "register";
}

export default function OAuthButtons({ returnTo, mode = "login" }: OAuthButtonsProps) {
  const { setSession } = useAuth();
  const [error, setError] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<"github" | "google" | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const actionLabel = mode === "register" ? "Registrarse" : "Continuar";

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setError("Google OAuth no configurado. Agregá NEXT_PUBLIC_GOOGLE_CLIENT_ID al .env.local");
      return;
    }
    if (!window.google?.accounts?.id) {
      setError("Error cargando Google. Recargá la página e intentá nuevamente.");
      return;
    }
    setError("");
    setLoadingProvider("google");
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: { credential: string }) => {
        try {
          /**
           * El `credential` viaja entero y sin tocar. Antes acá se hacía
           * `split(".")` + `atob` para sacarle `sub`/`email` y mandarlos como
           * campos sueltos: eso es leer el token, no verificarlo, y el backend
           * terminaba emitiendo sesión para el email que le dijera el cliente.
           * La verificación (firma, emisor, audiencia, expiración) es del
           * backend contra las claves públicas de Google; el browser solo
           * transporta la prueba.
           */
          const session = await exchangeGoogleCredential(response.credential);
          setSession(session.accessToken, session.user, returnTo);
        } catch (err) {
          setError(describeOAuthError(err));
          setLoadingProvider(null);
        }
      },
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError("No se pudo abrir el popup de Google. Verificá que las cookies de terceros no estén bloqueadas.");
        setLoadingProvider(null);
      }
    });
  };

  /**
   * El `state` llevaba SOLO el `returnTo`, o sea que no era un `state`: era un
   * parámetro de navegación con nombre de parámetro de seguridad. Sin un valor
   * imprevisible que atemos a esta pestaña, cualquiera puede fabricar el
   * callback y hacer que la víctima termine autenticada en una cuenta ajena
   * (CSRF de login). Ahora el `state` es un nonce del CSPRNG que:
   *
   *   1. se guarda en `sessionStorage` — aislado por pestaña, así que probar
   *      que vuelve es probar que ESTA pestaña arrancó el flujo;
   *   2. viaja a GitHub, que lo devuelve tal cual;
   *   3. lo verifica `/oauth-success` antes de escribir la sesión.
   *
   * Si `sessionStorage` no está disponible (modo privado, cookies bloqueadas)
   * cortamos acá: es preferible avisar antes de salir que fallar después del
   * viaje de ida y vuelta sin poder explicar por qué.
   *
   * Hoy no se llega acá: el botón está deshabilitado (ver
   * `GITHUB_LOGIN_ENABLED`). Queda intacto para cuando se reactive.
   */
  const handleGithubLogin = () => {
    if (!GITHUB_LOGIN_ENABLED) return;
    if (!githubClientId) {
      setError("GitHub OAuth no configurado. Agregá NEXT_PUBLIC_GITHUB_CLIENT_ID al .env.local");
      return;
    }

    const nonce = createOAuthNonce();
    try {
      sessionStorage.setItem(OAUTH_NONCE_STORAGE_KEY, nonce);
    } catch {
      setError("Tu navegador está bloqueando el almacenamiento del sitio. Habilitalo o usá tu email y contraseña.");
      return;
    }

    setError("");
    setLoadingProvider("github");
    const params = new URLSearchParams({
      client_id: githubClientId,
      scope: "user:email",
      state: encodeOAuthState(nonce, returnTo),
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  return (
    <div className="space-y-3">
      {googleClientId && (
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 h-11 border border-fog-gray rounded-lg text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingProvider === "google" ? (
          <span className="h-4 w-4 border-2 border-carbon-gray border-t-transparent rounded-full animate-spin" />
        ) : (
          <Chrome className="h-4 w-4 text-blue-500" />
        )}
        {loadingProvider === "google" ? "Conectando..." : `${actionLabel} con Google`}
      </button>

      <div>
        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={!GITHUB_LOGIN_ENABLED || loadingProvider !== null}
          aria-describedby={GITHUB_LOGIN_ENABLED ? undefined : "github-oauth-note"}
          className="w-full flex items-center justify-center gap-3 h-11 border border-fog-gray rounded-lg text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loadingProvider === "github" ? (
            <span className="h-4 w-4 border-2 border-carbon-gray border-t-transparent rounded-full animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          {!GITHUB_LOGIN_ENABLED
            ? "GitHub no disponible"
            : loadingProvider === "github"
              ? "Redirigiendo a GitHub..."
              : `${actionLabel} con GitHub`}
        </button>

        {!GITHUB_LOGIN_ENABLED && (
          <p id="github-oauth-note" className="mt-1.5 text-xs text-slate-gray text-center px-2">
            El ingreso con GitHub está fuera de servicio por ahora. Usá Google o tu email y contraseña.
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-soft-coral text-center px-2" role="alert">{error}</p>
      )}
    </div>
  );
}
