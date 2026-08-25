const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("davinci_token");
}

/**
 * Opciones de caché que Next agrega a `fetch` y que NO existen en el
 * `RequestInit` del DOM, por eso van declaradas a mano.
 *
 * Sólo tienen efecto en el servidor (Server Components, route handlers). En el
 * browser Next las ignora.
 */
export interface NextFetchOptions {
  /**
   * Segundos de vida de la respuesta en el Data Cache de Next.
   * `0` = sin caché, `false` = cachear indefinidamente.
   */
  revalidate?: number | false;
  /** Etiquetas para invalidar selectivamente con `revalidateTag()`. */
  tags?: string[];
}

export interface FetchOptions extends RequestInit {
  auth?: boolean;
  /**
   * Caché de Next. **Sólo para respuestas públicas e idénticas para todos.**
   *
   * Se ignora deliberadamente cuando `auth` es `true`: el Data Cache es
   * compartido por proceso, así que cachear una respuesta que depende del token
   * la serviría a otro usuario. Hay que pasarlo explícito en cada llamada
   * pública; no hay default.
   */
  next?: NextFetchOptions;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, next, ...rest } = options;

  // Don't set Content-Type for FormData — browser sets it with the multipart boundary
  const isFormData = rest.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(rest.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit & { next?: NextFetchOptions } = { ...rest, headers };

  // Guarda dura: una respuesta autenticada nunca entra al Data Cache.
  if (next) {
    if (auth) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[apiFetch] Se descartó la opción \`next\` en ${path}: la request es autenticada y ` +
            `el Data Cache es compartido entre usuarios. Pasá \`auth: false\` si el recurso es público.`
        );
      }
    } else {
      init.next = next;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, init);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || `Error ${res.status}`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }

  return data as T;
}
