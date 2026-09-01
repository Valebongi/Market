import { apiFetch } from "@/lib/http";
import type { ApiSuccessResponse, AuthResponse } from "@/types";

export const authService = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),

  /**
   * `POST /auth/oauth/callback` — espejo exacto de `OAuthCallbackDto` de
   * auth-service.
   *
   * El body es **sólo** `{ provider, credential }`:
   *
   * - `provider` hoy únicamente acepta `"google"`. El backend lo valida con
   *   `@IsIn(['google'])` y devuelve 400 con cualquier otro valor — GitHub está
   *   deshabilitado a propósito hasta que el intercambio del `code` viva dentro
   *   de auth-service.
   * - `credential` es el ID token de Google **entero y sin tocar** (el campo
   *   `credential` del callback de `google.accounts.id`). No lo decodifiques ni
   *   le saques claims: auth-service lo verifica contra el JWKS de Google
   *   (firma, `iss`, `aud`, `exp`, `email_verified`).
   *
   * La firma anterior era `{ provider, providerId, email, name }`. El cliente
   * afirmaba la identidad y el backend emitía un token confiando en ella, o sea
   * que postear el email de otro alcanzaba para llevarse su cuenta. Ese shape ya
   * no existe en ningún lado: el DTO corre con `forbidNonWhitelisted`, así que
   * mandar `email` "por las dudas" es un 400.
   */
  oauthCallback: (body: { provider: string; credential: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/oauth/callback", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),
};
