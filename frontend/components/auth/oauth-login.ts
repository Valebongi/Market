import { ApiError, apiFetch } from "@/lib/http";
import type { ApiSuccessResponse, AuthResponse } from "@/types";

/**
 * Intercambio del ID token de Google por una sesión nuestra.
 *
 * ## Qué estaba roto
 *
 * El cliente decodificaba el ID token (`atob` sobre el payload del JWT) y le
 * mandaba al backend `email` + `providerId` como datos sueltos. El backend
 * emitía un JWT para esa cuenta sin más preguntas, o sea que el "login con
 * Google" era en realidad "decime de quién querés ser dueño": bastaba con
 * postear el email ajeno. Decodificar un JWT no lo valida — solo lo lee.
 *
 * ## Ahora
 *
 * El único parámetro es el `credential` **entero y sin tocar**, tal cual lo
 * entrega Google. auth-service lo verifica contra las claves públicas de
 * Google: firma, emisor, audiencia, expiración y `email_verified`. El cliente
 * ya no afirma nada sobre la identidad; solo transporta la prueba.
 *
 * El body es exactamente `{ provider, credential }`: el backend corre con
 * `forbidNonWhitelisted`, así que agregar `email` "por las dudas" devuelve 400.
 *
 * NOTA para front-core: esto debería vivir en `services/auth.service.ts`. Su
 * `oauthCallback` todavía tiene la firma vieja (`{provider, providerId, email,
 * name}`) y no la puedo cambiar desde acá. Cuando se re-tipe a
 * `{provider, credential}`, esta función pasa a delegar en el servicio y se
 * borra el `apiFetch` directo.
 */
export async function exchangeGoogleCredential(credential: string): Promise<AuthResponse> {
  const res = await apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/oauth/callback", {
    method: "POST",
    body: JSON.stringify({ provider: "google", credential }),
    auth: false,
  });
  return res.data;
}

/**
 * Mensaje para el usuario según lo que respondió el backend.
 *
 * La distinción que importa es 401 vs 503, que antes se mostraban igual:
 *
 * - **401** — la identidad no se pudo verificar (firma, emisor, audiencia,
 *   expiración o email sin verificar). Es un problema del lado del usuario y
 *   reintentar puede resolverlo.
 * - **503** — el backend no tiene configurado el Client ID o no llega a las
 *   claves de Google. Reintentar no sirve y el usuario no puede hacer nada:
 *   hay que decirle que es nuestro, para que no crea que su cuenta tiene algo
 *   raro y se ponga a "arreglarla".
 */
export function describeOAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 503:
        return "El ingreso con Google no está disponible en este momento. Es un problema nuestro, no de tu cuenta. Probá con tu email y contraseña.";
      case 401:
        return "No pudimos verificar tu identidad con Google. Volvé a intentarlo o ingresá con tu email y contraseña.";
      case 400:
        return "Google no devolvió una credencial válida. Volvé a intentarlo desde el botón.";
      default:
        return "No pudimos completar el ingreso con Google. Volvé a intentarlo en un momento.";
    }
  }
  return "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
}
