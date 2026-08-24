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

export interface FetchOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, ...rest } = options;

  // Don't set Content-Type for FormData — browser sets it with the multipart boundary
  const isFormData = rest.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

  return data as T;
}
