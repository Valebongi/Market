"use client";

import { useState } from "react";
import Script from "next/script";
import { Github, Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  createOAuthNonce,
  encodeOAuthState,
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

/** Claims del ID token de Google que consumimos acá (JWT decodificado). */
interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
}

interface OAuthButtonsProps {
  returnTo?: string;
  mode?: "login" | "register";
}

export default function OAuthButtons({ returnTo, mode = "login" }: OAuthButtonsProps) {
  const { loginWithOAuth } = useAuth();
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
          const [, b64] = response.credential.split(".");
          const payload: GoogleIdTokenPayload = JSON.parse(
            atob(b64.replace(/-/g, "+").replace(/_/g, "/"))
          );
          await loginWithOAuth("google", payload.sub, payload.email, payload.name || payload.email, returnTo);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al iniciar sesión con Google");
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
   */
  const handleGithubLogin = () => {
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

      <button
        type="button"
        onClick={handleGithubLogin}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 h-11 border border-fog-gray rounded-lg text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingProvider === "github" ? (
          <span className="h-4 w-4 border-2 border-carbon-gray border-t-transparent rounded-full animate-spin" />
        ) : (
          <Github className="h-4 w-4" />
        )}
        {loadingProvider === "github" ? "Redirigiendo a GitHub..." : `${actionLabel} con GitHub`}
      </button>

      {error && (
        <p className="text-xs text-soft-coral text-center px-2">{error}</p>
      )}
    </div>
  );
}
