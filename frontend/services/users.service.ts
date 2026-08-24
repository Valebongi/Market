import { apiFetch } from "@/lib/http";
import type { AuthUser } from "@/types";

export const usersService = {
  getProfile: (userId: string) =>
    apiFetch<AuthUser>(`/users/${userId}`),

  updateProfile: (userId: string, body: Partial<{ displayName: string; avatarUrl: string; bio: string; linkedin: string; twitter: string; github: string; website: string; location: string }>) =>
    apiFetch<AuthUser>(`/users/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  updateNotifications: (userId: string, body: Record<string, boolean>) =>
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
