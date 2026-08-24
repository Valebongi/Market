import { apiFetch } from "@/lib/http";
import type { DomainSearchResponse } from "@/types";

export const domainsService = {
  search: (query: string, extensions?: string[]) =>
    apiFetch<DomainSearchResponse>("/domains/search", {
      method: "POST",
      body: JSON.stringify({ query, extensions }),
    }),

  history: () =>
    apiFetch<DomainSearchResponse[]>("/domains/history"),
};
