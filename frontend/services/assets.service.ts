import { apiFetch } from "@/lib/http";
import type { RawAsset, Asset, PaginatedResponse } from "@/types";

export const assetsService = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<PaginatedResponse<RawAsset>>(`/assets${qs}`, { auth: false });
  },

  get: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}`, { auth: false }),

  create: (body: Partial<RawAsset>) =>
    apiFetch<RawAsset>("/assets", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<RawAsset>) =>
    apiFetch<RawAsset>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  publish: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}/publish`, { method: "PATCH" }),

  archive: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}/archive`, { method: "PATCH" }),

  remove: (id: string) =>
    apiFetch<{ message: string }>(`/assets/${id}`, { method: "DELETE" }),
};

// Maps raw backend shape → frontend Asset type
export function mapAsset(a: RawAsset): Asset {
  return {
    id: a.id,
    ownerId: a.ownerId,
    title: a.title,
    slug: a.slug,
    description: a.description,
    assetType: a.category,
    licenseType: a.licenseType,
    territory: a.territory,
    duration: a.duration,
    status: a.status,
    priceType: a.pricingType === "negotiable" ? "negotiable" : "fixed",
    priceFixed: a.pricingType !== "negotiable" ? Number(a.price ?? 0) : undefined,
    priceCurrency: a.currency || "USD",
    allowedUses: a.allowedUses ?? [],
    additionalConditions: a.restrictions?.join("; ") || undefined,
    tags: a.tags?.map((t) => t.tag) ?? [],
    externalLinks: a.links?.filter((l) => l.label !== "preview").map((l) => l.url) ?? [],
    previewUrls: a.links?.filter((l) => l.label === "preview").map((l) => l.url) ?? [],
    coverImageUrl: a.coverImageUrl,
    viewCount: a.viewCount ?? 0,
    requestCount: a.requestCount ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
