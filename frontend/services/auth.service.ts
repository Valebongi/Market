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

  oauthCallback: (body: { provider: string; providerId: string; email: string; name: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/oauth/callback", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),
};
