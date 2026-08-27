"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  decodeOAuthHandoff,
  OAUTH_HANDOFF_COOKIE,
  OAUTH_HANDOFF_PATH,
  OAUTH_NONCE_STORAGE_KEY,
} from "@/components/auth/oauth-handoff";
import type { AuthUser } from "@/types";

/**
 * Lee y borra la cookie de handoff en el mismo paso. De un solo uso: si el
 * usuario recarga `/oauth-success` no hay una segunda sesión para consumir.
 */
function takeHandoffCookie(): string | null {
  const prefix = `${OAUTH_HANDOFF_COOKIE}=`;
  const hit = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));

  document.cookie = `${OAUTH_HANDOFF_COOKIE}=; path=${OAUTH_HANDOFF_PATH}; max-age=0; SameSite=Lax`;
  return hit ? hit.slice(prefix.length) : null;
}

/** Ídem para el nonce: se consume una vez y se descarta pase lo que pase. */
function takeNonce(): string | null {
  try {
    const nonce = sessionStorage.getItem(OAUTH_NONCE_STORAGE_KEY);
    sessionStorage.removeItem(OAUTH_NONCE_STORAGE_KEY);
    return nonce;
  } catch {
    return null;
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  const user = value as Partial<AuthUser> | null;
  return (
    !!user &&
    typeof user === "object" &&
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.role === "string"
  );
}

/**
 * Aterrizaje del OAuth de GitHub. Su único trabajo es mover la sesión que
 * emitió nuestro backend a `localStorage` y redirigir.
 *
 * Antes aceptaba `?token=&user=` de la querystring y los escribía sin
 * preguntar nada, o sea que un link como
 * `…/oauth-success?token=<JWT del atacante>` dejaba a la víctima operando
 * dentro de la cuenta del atacante sin notarlo (fijación de sesión). En un
 * marketplace donde la gente negocia licencias, eso es fraude servido.
 *
 * Ahora la página exige las dos garantías que describe
 * `components/auth/oauth-handoff.ts`, y si falta cualquiera no escribe nada:
 *
 *  1. La sesión llega por una **cookie de nuestro origen** que solo pudo poner
 *     nuestro route handler. Un tercero no puede escribirla desde afuera, y de
 *     paso el token ya no pasa por la URL.
 *  2. El **nonce** que vuelve tiene que coincidir con el que esta pestaña
 *     guardó en `sessionStorage` antes de salir hacia GitHub. Es la prueba de
 *     que el flujo lo arrancó esta pestaña y no un link que mandó alguien.
 *
 * No hay `Suspense` porque ya no se leen search params: todo sale de la cookie
 * y de `sessionStorage`, así que no se dispara el bailout de Next.
 */
function useOAuthLanding() {
  const { setSession } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Consumir SIEMPRE los dos, incluso si vamos a fallar: nada de esto puede
    // quedar disponible para un segundo intento.
    const raw = takeHandoffCookie();
    const expectedNonce = takeNonce();

    const handoff = decodeOAuthHandoff(raw);

    if (!handoff || !expectedNonce || handoff.nonce !== expectedNonce) {
      setFailed(true);
      return;
    }

    if (!isAuthUser(handoff.user)) {
      setFailed(true);
      return;
    }

    setSession(handoff.accessToken, handoff.user, handoff.returnTo);
    // `setSession` sale de la página con `router.replace`; correrlo una sola
    // vez al montar es intencional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return failed;
}

export default function OAuthSuccessPage() {
  const failed = useOAuthLanding();

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-snow-gray px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-carbon-gray">
            No pudimos completar el ingreso
          </h1>
          <p className="mt-2 text-sm text-slate-gray">
            El enlace venció o no se inició desde esta pestaña. Volvé a intentarlo
            desde la pantalla de ingreso.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-electric-blue px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-snow-gray">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-electric-blue border-t-transparent"
        role="status"
        aria-label="Completando el ingreso"
      />
    </main>
  );
}
