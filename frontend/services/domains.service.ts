import { apiFetch } from "@/lib/http";
import type { DomainSearchResponse, DomainSearchRecord } from "@/types";

export const domainsService = {
  /**
   * `POST /domains/search`. Cada `DomainResult` trae `registrarUrl` ya armado
   * (link de afiliación de Namecheap) cuando `available === true`: ese es el
   * link que hay que abrir, no la home del registrador.
   */
  search: (query: string, extensions?: string[]) =>
    apiFetch<DomainSearchResponse>("/domains/search", {
      method: "POST",
      body: JSON.stringify({ query, extensions }),
    }),

  /**
   * `GET /domains/history`. Devuelve filas Prisma `DomainSearch`
   * (`{id, userId, query, results, createdAt}`), NO `DomainSearchResponse[]`:
   * cada fila es una búsqueda entera con sus N dominios adentro.
   *
   * `limit` es opcional (1..100, default 10 en backend). Se omite del
   * querystring si no se pasa: mandar `?limit=` da 400.
   */
  history: (limit?: number) =>
    apiFetch<DomainSearchRecord[]>(
      `/domains/history${limit != null ? `?limit=${limit}` : ""}`
    ),
};
