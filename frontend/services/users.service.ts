import { apiFetch } from "@/lib/http";
import type { NotificationSettings, UserProfile, UpdateUserProfilePayload } from "@/types";

/**
 * NO HAY —NI VA A HABER— `updateRole()` NI `updateStatus()` ACÁ.
 *
 * `PATCH /users/:userId/role` y `PATCH /users/:userId/status` existen en
 * users-service y devuelven 200, pero son COSMÉTICOS: escriben
 * `user_profiles`, que es la copia que este listado muestra y filtra, y que
 * nadie consulta para autorizar. Verificado en producción:
 *
 *   - cambiar el rol por ahí NO cambia el rol efectivo (el que vale es el que
 *     auth-service firma en el JWT);
 *   - suspender por ahí NO impide loguearse (el login lee `auth.users.status`).
 *
 * O sea, el peor tipo de bug: el panel confirma una acción que no ocurrió.
 *
 * La fuente de verdad se escribe con `authService.adminUpdateRole()` y
 * `authService.adminUpdateStatus()` (`services/auth.service.ts`), que además
 * replican a esta copia. Envolver los endpoints cosméticos en un método con
 * nombre razonable sería reabrir el mismo pozo, así que se dejan sin envolver
 * a propósito.
 */
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
