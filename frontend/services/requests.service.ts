import { apiFetch } from "@/lib/http";
import type { LicenseRequest, RequestMessage, PaginatedResponse } from "@/types";

export const requestsService = {
  list: (role?: "requester" | "owner" | "all") =>
    apiFetch<PaginatedResponse<LicenseRequest>>(`/requests/mine?role=${role ?? "all"}`),

  get: (id: string) =>
    apiFetch<LicenseRequest>(`/requests/${id}`),

  create: (body: { assetId: string; message?: string; assetTitle?: string }) =>
    apiFetch<LicenseRequest>("/requests", { method: "POST", body: JSON.stringify(body) }),

  sendMessage: (requestId: string, content: string) =>
    apiFetch<RequestMessage>(`/requests/${requestId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

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

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
