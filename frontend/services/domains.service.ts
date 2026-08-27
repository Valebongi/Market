import { apiFetch } from "@/lib/http";
import type {
  DomainSearchResponse,
  DomainSearchRecord,
  DomainResult,
  TldPricing,
} from "@/types";

/**
 * Precio listo para renderizar. **Los dos precios y el disclaimer viajan
 * juntos y los tres son obligatorios**: no existe una instancia de este tipo
 * con el primer año y sin la renovación, ni con precio y sin disclaimer.
 *
 * Se construye únicamente con `toDomainPricingView()`.
 */
export interface DomainPricingView {
  currency: string;
  firstYear: number;
  renewal: number;
  /** ISO timestamp de cuándo el registrador publicó estos precios. */
  asOf: string;
  /** Siempre `true`: es precio de referencia, no el del checkout. */
  isReference: true;
  /**
   * El `pricingDisclaimer` del envelope. Obligatorio: si esto está en
   * pantalla, el disclaimer también.
   */
  disclaimer: string;
}

/**
 * Único camino soportado para llevar un precio a la UI.
 *
 * Devuelve `null` — es decir, "no muestres precio" — en dos casos:
 * 1. `pricing` es `null` (el backend no conoce el precio de ese TLD, o
 *    `meta.pricingAvailable === false`).
 * 2. `pricing` existe pero el envelope vino sin `pricingDisclaimer`. Falla
 *    cerrado a propósito: un precio de referencia sin su aclaración es peor
 *    que no mostrar nada.
 *
 * Al devolver un objeto con `firstYear`, `renewal` y `disclaimer` juntos,
 * hace falta salirse del camino (leer `result.pricing` a mano) para poder
 * renderizar el primer año sin la renovación.
 */
export function toDomainPricingView(
  pricing: TldPricing | null | undefined,
  pricingDisclaimer: string | null | undefined
): DomainPricingView | null {
  if (!pricing) return null;
  const disclaimer = pricingDisclaimer?.trim();
  if (!disclaimer) return null;
  return {
    currency: pricing.currency,
    firstYear: pricing.firstYear,
    renewal: pricing.renewal,
    asOf: pricing.asOf,
    isReference: true,
    disclaimer,
  };
}

/**
 * `true` si hay algún precio en la respuesta — en `results`, en `suggestions`
 * o en cualquier `offers[]`. Cuando da `true`, `pricingDisclaimer` tiene que
 * estar visible en esa pantalla.
 */
export function hasAnyPricing(response: DomainSearchResponse): boolean {
  const anyPricedResult = (r: DomainResult) =>
    r.pricing != null || r.offers.some((o) => o.pricing != null);
  return (
    response.results.some(anyPricedResult) ||
    response.suggestions.some(anyPricedResult)
  );
}

export const domainsService = {
  /**
   * `POST /domains/search`.
   *
   * Cada `DomainResult` trae `registrarUrl` (link de afiliación principal) y
   * `offers[]` con todas las opciones de compra, ya con la atribución armada
   * por el backend: usá esos links, no la home del registrador.
   *
   * La respuesta suma `suggestions` (alternativas generadas, cada una con
   * `suggestionKind`), `pricingDisclaimer` y `meta`. Para mostrar precios,
   * pasá `pricing` y `response.pricingDisclaimer` por `toDomainPricingView()`.
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
   * Sus `results` son `DomainHistoryResult`, **más angostos** que
   * `DomainResult`: sólo `{domain, extension, available, status}`. No hay
   * precios ni links de compra, y no es un olvido — un precio o un carrito
   * congelados días atrás son información falsa. Para un precio actual hay
   * que volver a llamar a `search()`.
   *
   * `limit` es opcional (1..100, default 10 en backend). Se omite del
   * querystring si no se pasa: mandar `?limit=` da 400.
   */
  history: (limit?: number) =>
    apiFetch<DomainSearchRecord[]>(
      `/domains/history${limit != null ? `?limit=${limit}` : ""}`
    ),
};
