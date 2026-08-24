import { apiFetch } from "@/lib/http";
import type { NotificationSettings, UserProfile, UpdateUserProfilePayload } from "@/types";

export const usersService = {
  /**
   * `GET /users/:userId` → users-service devuelve el `UserProfile` PLANO
   * (con `displayName` en la raíz, no dentro de `profile`).
   */
  getProfile: (userId: string) => apiFetch<UserProfile>(`/users/${userId}`),

  updateProfile: (userId: string, body: UpdateUserProfilePayload) =>
    apiFetch<UserProfile>(`/users/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /**
   * `PATCH /users/:userId/notifications`.
   *
   * El body está tipado como `Partial<NotificationSettings>` a propósito: con
   * `Record<string, boolean>` cualquier clave inventada compilaba y el backend
   * la descartaba en silencio (así se coló el bug de `newRequest`/`newMessage`
   * & co., que nunca persistieron nada). Ahora una clave desconocida es error
   * de compilación acá y `class-validator` la rechaza del lado servidor.
   */
  updateNotifications: (userId: string, body: Partial<NotificationSettings>) =>
    apiFetch<{ message: string }>(`/users/${userId}/notifications`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getSavedAssets: (userId: string) =>
    apiFetch<{ data: string[]; total: number }>(`/users/${userId}/saved`),

  saveAsset: (userId: string, assetId: string) =>
    apiFetch<{ message: string }>(`/users/${userId}/saved/${assetId}`, { method: "POST" }),

  unsaveAsset: (userId: string, assetId: string) =>
    apiFetch<{ message: string }>(`/users/${userId}/saved/${assetId}`, { method: "DELETE" }),
};
