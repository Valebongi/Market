/**
 * Handoff del OAuth de GitHub: cómo viaja la sesión desde
 * `app/api/auth/github/callback/route.ts` hasta `app/oauth-success/page.tsx`.
 *
 * ## Qué estaba roto
 *
 * La versión anterior mandaba `?token=<JWT>&user=<json>` en la querystring y
 * `/oauth-success` escribía en `localStorage` **cualquier** cosa que viniera
 * ahí. Dos problemas distintos:
 *
 * 1. **Fijación de sesión.** Un atacante manda
 *    `https://vinciinventa.com/oauth-success?token=<SU propio JWT>&user=<...>`
 *    y la víctima queda logueada, en silencio, dentro de la cuenta del
 *    atacante. En un marketplace eso no es una molestia: la víctima negocia,
 *    publica y escribe creyendo que es su cuenta, y el atacante lee todo.
 * 2. **El token en la URL.** Queda en el historial del browser, en los logs de
 *    cualquier proxy y en el `Referer` de la primera request saliente.
 *
 * ## La garantía que hace falta
 *
 * `/oauth-success` tiene que poder afirmar dos cosas antes de tocar
 * `localStorage`:
 *
 * - que el token lo emitió **nuestro** backend (no lo puso quien armó el link), y
 * - que el flujo lo arrancó **esta misma pestaña** (no llegó por un link ajeno).
 *
 * Se resuelve con dos mecanismos que se complementan:
 *
 * - **Nonce en `sessionStorage`.** `OAuthButtons` genera un valor aleatorio
 *   antes de irse a GitHub, lo guarda y lo manda como `state`. GitHub lo
 *   devuelve, el route handler lo reinyecta, y la página lo compara contra lo
 *   guardado. `sessionStorage` está aislado **por pestaña**, así que esto es
 *   literalmente la prueba de "este flujo lo arranqué yo, acá". Un link que
 *   mande un tercero abre una pestaña sin nonce y no pasa. Y como el mismo
 *   valor va en el `state` de GitHub, cubre además el CSRF de login del punto 3.
 * - **Cookie de un solo uso en vez de querystring.** El token y el usuario
 *   viajan en una cookie de host, `SameSite=Lax`, acotada a `/oauth-success` y
 *   con vida de 2 minutos. Un atacante no puede escribir cookies de nuestro
 *   origen desde afuera, y el token deja de aparecer en la URL. La página la
 *   borra apenas la lee.
 *
 * Ninguno de los dos alcanza solo: la cookie sin nonce sigue sin probar qué
 * pestaña inició el flujo, y el nonce sin cookie deja el token en la URL.
 *
 * El módulo es **isomórfico** a propósito (`btoa`/`atob`, `TextEncoder`): lo
 * importan tanto el route handler como el componente cliente.
 */

/**
 * Interruptor único del login con GitHub. Vive acá, y no en `OAuthButtons.tsx`,
 * porque lo necesitan los dos extremos del flujo: el botón (componente cliente)
 * y `app/api/auth/github/callback/route.ts` (route handler de servidor). Este
 * módulo es isomórfico y no lleva `"use client"`, así que se puede importar
 * desde ambos sin arrastrar código de cliente al bundle del servidor.
 *
 * Está apagado porque el callback le habla a `/auth/oauth/callback` con el
 * shape viejo (`providerId` + `email` crudos) que el backend ya rechaza: el DTO
 * corre con `forbidNonWhitelisted` y devuelve 400. Apagarlo en un solo lugar
 * evita que el botón y el callback queden desincronizados.
 *
 * Para reactivar: poner en `true` cuando el callback mande una credencial
 * verificable en vez de un email autoafirmado.
 */
// Tipado como `boolean` a propósito: sin la anotación TS lo estrecha al literal
// `false` y marca como muerto todo el flujo que queremos conservar intacto.
export const GITHUB_LOGIN_ENABLED: boolean = false;

/** Cookie de un solo uso con la sesión recién emitida. */
export const OAUTH_HANDOFF_COOKIE = "davinci_oauth_handoff";

/** Path al que se acota la cookie: no se manda en ninguna otra request. */
export const OAUTH_HANDOFF_PATH = "/oauth-success";

/** Ventana de vida de la cookie, en segundos. Alcanza para un redirect. */
export const OAUTH_HANDOFF_MAX_AGE = 120;

/** Clave del nonce en `sessionStorage` (aislado por pestaña). */
export const OAUTH_NONCE_STORAGE_KEY = "davinci_oauth_nonce";

/** Lo que el route handler le pasa a `/oauth-success`. */
export interface OAuthHandoff {
  /** Eco del nonce que generó esta pestaña antes de ir a GitHub. */
  nonce: string;
  accessToken: string;
  user: unknown;
  /** Ruta interna ya normalizada por el route handler. */
  returnTo: string;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * base64url para el valor de la cookie y para el `state`.
 *
 * No es cifrado ni firma: es codificación. El valor de una cookie no admite
 * `;`, `,`, espacios ni comillas, y el `state` de OAuth viaja en una URL;
 * base64url evita tener que pensar en el escapado de cada uno. La seguridad la
 * dan el origen de la cookie y el nonce, no esta función.
 */
export function encodeOAuthHandoff(payload: OAuthHandoff): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeOAuthHandoff(raw: string | null | undefined): OAuthHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as Partial<OAuthHandoff>;
    if (
      typeof parsed?.nonce !== "string" ||
      typeof parsed?.accessToken !== "string" ||
      !parsed.nonce ||
      !parsed.accessToken ||
      typeof parsed?.user !== "object" ||
      parsed.user === null
    ) {
      return null;
    }
    return {
      nonce: parsed.nonce,
      accessToken: parsed.accessToken,
      user: parsed.user,
      returnTo: typeof parsed.returnTo === "string" ? parsed.returnTo : "/dashboard",
    };
  } catch {
    return null;
  }
}

/** 128 bits del CSPRNG del browser. Solo se llama en el click del usuario. */
export function createOAuthNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** `state` que se le manda a GitHub: nonce + destino post-login. */
export function encodeOAuthState(nonce: string, returnTo?: string): string {
  return toBase64Url(JSON.stringify({ nonce, returnTo: returnTo ?? "" }));
}

export function parseOAuthState(raw: string | null | undefined): {
  nonce: string;
  returnTo: string;
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as { nonce?: unknown; returnTo?: unknown };
    if (typeof parsed?.nonce !== "string" || !parsed.nonce) return null;
    return {
      nonce: parsed.nonce,
      returnTo: typeof parsed.returnTo === "string" ? parsed.returnTo : "",
    };
  } catch {
    return null;
  }
}
