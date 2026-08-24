import { apiFetch } from "@/lib/http";
import type {
  AppNotification,
  CreateLicenseRequestPayload,
  LicenseRequest,
  PaginatedResponse,
  RequestMessage,
} from "@/types";

export const requestsService = {
  list: (role?: "requester" | "owner" | "all") =>
    apiFetch<PaginatedResponse<LicenseRequest>>(`/requests/mine?role=${role ?? "all"}`),

  get: (id: string) =>
    apiFetch<LicenseRequest>(`/requests/${id}`),

  /**
   * `POST /requests` — espejo de `CreateRequestDto` de messaging-service.
   * `assetTitle`, `ownerId` e `initialMessage` son obligatorios.
   */
  create: (body: CreateLicenseRequestPayload) =>
    apiFetch<LicenseRequest>("/requests", { method: "POST", body: JSON.stringify(body) }),

  sendMessage: (requestId: string, content: string) =>
    apiFetch<RequestMessage>(`/requests/${requestId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  /**
   * `PATCH /requests/:id/status`.
   * El backend sólo acepta `accepted` | `rejected` | `closed`
   * (ver `RequestStatusTransition`); `pending` es rechazado con 400.
   */
  updateStatus: (requestId: string, status: string) =>
    apiFetch<LicenseRequest>(`/requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  unreadCount: () =>
    apiFetch<number>("/requests/unread-count"),

  getNotifications: (limit = 20) =>
    apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(`/requests/notifications?limit=${limit}`),

  markNotificationsRead: () =>
    apiFetch<{ message: string }>("/requests/notifications/read-all", { method: "PATCH" }),
};

// Re-export por compatibilidad: el tipo ahora vive en @/types.
export type { AppNotification } from "@/types";
