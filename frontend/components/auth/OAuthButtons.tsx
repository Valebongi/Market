"use client";

import { useState } from "react";
import Script from "next/script";
import { Github, Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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

interface OAuthButtonsProps {
  returnTo?: string;
  mode?: "login" | "register";
}

export default function OAuthButtons({ returnTo, mode = "login" }: OAuthButtonsProps) {
  const { loginWithOAuth } = useAuth();
  const [error, setError] = useState("");

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
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: { credential: string }) => {
        try {
          // Decode the Google JWT payload (base64url → JSON)
          const [, b64] = response.credential.split(".");
          const payload = JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/")));
          await loginWithOAuth("google", payload.sub, payload.email, payload.name || payload.email, returnTo);
        } catch (err: any) {
          setError(err.message || "Error al iniciar sesión con Google");
        }
      },
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError("No se pudo abrir el popup de Google. Verificá que las cookies de terceros no estén bloqueadas.");
      }
    });
  };

  const handleGithubLogin = () => {
    if (!githubClientId) {
      setError("GitHub OAuth no configurado. Agregá NEXT_PUBLIC_GITHUB_CLIENT_ID al .env.local");
      return;
    }
    setError("");
    const params = new URLSearchParams({ client_id: githubClientId, scope: "user:email" });
    if (returnTo) params.set("state", encodeURIComponent(returnTo));
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
        className="w-full flex items-center justify-center gap-3 h-11 border border-fog-gray rounded-lg text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors"
      >
        <Chrome className="h-4 w-4 text-blue-500" />
        {actionLabel} con Google
      </button>

      <button
        type="button"
        onClick={handleGithubLogin}
        className="w-full flex items-center justify-center gap-3 h-11 border border-fog-gray rounded-lg text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors"
      >
        <Github className="h-4 w-4" />
        {actionLabel} con GitHub
      </button>

      {error && (
        <p className="text-xs text-soft-coral text-center px-2">{error}</p>
      )}
    </div>
  );
}
