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

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || `Error ${res.status}`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    apiFetch<{ statusCode: number; data: { accessToken: string; user: AuthUser } }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(body), auth: false }
    ),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ statusCode: number; data: { accessToken: string; user: AuthUser } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body), auth: false }
    ),

  oauthCallback: (body: { provider: string; providerId: string; email: string; name: string }) =>
    apiFetch<{ statusCode: number; data: { accessToken: string; user: AuthUser } }>(
      "/auth/oauth/callback",
      { method: "POST", body: JSON.stringify(body), auth: false }
    ),
};

// ── Assets ────────────────────────────────────────────────────────────
export const assetsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return apiFetch<{ data: any[]; total: number; page: number; totalPages: number }>(
      `/assets${qs}`,
      { auth: false }
    );
  },
  get: (id: string) => apiFetch<any>(`/assets/${id}`, { auth: false }),
  create: (body: any) =>
    apiFetch<any>("/assets", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch<any>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  publish: (id: string) =>
    apiFetch<any>(`/assets/${id}/publish`, { method: "PATCH" }),
  archive: (id: string) =>
    apiFetch<any>(`/assets/${id}/archive`, { method: "PATCH" }),
  remove: (id: string) =>
    apiFetch<any>(`/assets/${id}`, { method: "DELETE" }),
};

// ── Requests / Messaging ──────────────────────────────────────────────
export const requestsApi = {
  list: (role?: "requester" | "owner" | "all") =>
    apiFetch<{ data: any[]; total: number }>(`/requests/mine?role=${role ?? "all"}`),
  get: (id: string) => apiFetch<any>(`/requests/${id}`),
  create: (body: any) =>
    apiFetch<any>("/requests", { method: "POST", body: JSON.stringify(body) }),
  sendMessage: (requestId: string, content: string) =>
    apiFetch<any>(`/requests/${requestId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  updateStatus: (requestId: string, status: string) =>
    apiFetch<any>(`/requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  unreadCount: () => apiFetch<number>("/requests/unread-count"),
};

// ── Domains ───────────────────────────────────────────────────────────
export const domainsApi = {
  search: (query: string, extensions?: string[]) =>
    apiFetch<{ query: string; results: any[] }>("/domains/search", {
      method: "POST",
      body: JSON.stringify({ query, extensions }),
    }),
  history: () => apiFetch<any[]>("/domains/history"),
};

// ── Users ─────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: (userId: string) => apiFetch<any>(`/users/${userId}`),
  updateProfile: (userId: string, body: Record<string, any>) =>
    apiFetch<any>(`/users/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateNotifications: (userId: string, body: Record<string, boolean>) =>
    apiFetch<any>(`/users/${userId}/notifications`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Asset mapper (backend → frontend types) ────────────────────────────
// Backend uses category/pricingType/price; frontend uses assetType/priceType/priceFixed
export function mapAsset(a: any) {
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
    priceType: a.pricingType === "fixed" ? "fixed" : a.pricingType === "free" ? "fixed" : "negotiable",
    priceFixed: a.pricingType === "fixed" || a.pricingType === "free" ? Number(a.price ?? 0) : undefined,
    priceCurrency: a.currency || "USD",
    allowedUses: a.allowedUses || [],
    additionalConditions: a.restrictions?.join("; ") || undefined,
    tags: a.tags?.map((t: any) => t.tag) ?? [],
    externalLinks: a.links?.filter((l: any) => l.label !== "preview").map((l: any) => l.url) ?? [],
    previewUrls: a.links?.filter((l: any) => l.label === "preview").map((l: any) => l.url) ?? [],
    viewCount: a.viewCount ?? 0,
    requestCount: a.requestCount ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// ── Types ─────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "asset_owner" | "entrepreneur";
  profile?: {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
}
