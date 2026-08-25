import { LICENSE_TYPE_LABELS } from "@/lib/utils";

/**
 * Configuración compartida del catálogo: qué se lee de la URL, cómo se
 * serializa y cuáles son los valores válidos de cada filtro.
 *
 * El catálogo es SSR y su estado vive ENTERO en la querystring: es lo que hace
 * que cada combinación de filtros sea una URL real, enlazable y rastreable.
 * Antes el estado vivía en `useState` y el HTML servido no tenía un solo enlace
 * a un activo ni a una categoría.
 *
 * ESTE MÓDULO NO PUEDE LLEVAR `"use client"`, y las constantes de acá no pueden
 * mudarse a un componente cliente. Un Server Component que importa un valor
 * desde un módulo `"use client"` no recibe el valor: recibe una referencia de
 * cliente. Tener `CATALOG_SORT_VALUES` exportada desde `CatalogSortSelect.tsx`
 * compilaba sin una queja y explotaba en runtime con
 * `CATALOG_SORT_VALUES.includes is not a function`.
 */

/** Claves que el catálogo lee de la URL, en orden fijo de serialización. */
export const CATALOG_PARAM_KEYS = [
  "search",
  "category",
  "licenseType",
  "ownerId",
  "sortBy",
  "page",
] as const;

export type CatalogParams = Partial<
  Record<(typeof CATALOG_PARAM_KEYS)[number], string>
>;

export const CATALOG_SORT_OPTIONS = [
  { value: "createdAt", label: "Más recientes" },
  { value: "viewCount", label: "Más vistos" },
  { value: "requestCount", label: "Más solicitados" },
] as const;

export const CATALOG_SORT_VALUES: readonly string[] =
  CATALOG_SORT_OPTIONS.map((o) => o.value);

export const DEFAULT_SORT = "createdAt";

/** `value: ""` es "sin filtro" y produce `/assets` sin el parámetro. */
export const LICENSE_FILTERS = [
  { value: "", label: "Todas" },
  { value: "exclusive", label: LICENSE_TYPE_LABELS.exclusive },
  { value: "non_exclusive", label: LICENSE_TYPE_LABELS.non_exclusive },
  { value: "temporary", label: LICENSE_TYPE_LABELS.temporary },
] as const;

export const LICENSE_VALUES: readonly string[] = LICENSE_FILTERS.map(
  (l) => l.value,
).filter(Boolean);

/**
 * Devuelve el href del catálogo con `base` más `overrides`.
 *
 * - Un valor `undefined` o `""` en `overrides` BORRA el parámetro. Es lo que
 *   usan "Todas las categorías" y "Limpiar filtros".
 * - El orden de las claves es fijo. Dos rutas distintas al mismo filtro
 *   producen exactamente la misma URL, y no dos URLs que Google trataría como
 *   páginas separadas.
 * - Sin parámetros devuelve `/assets` pelado, no `/assets?`.
 */
export function catalogHref(
  base: CatalogParams,
  overrides: CatalogParams = {},
): string {
  const merged: CatalogParams = { ...base, ...overrides };
  const search = new URLSearchParams();

  for (const key of CATALOG_PARAM_KEYS) {
    const value = merged[key];
    if (value) search.set(key, value);
  }

  const qs = search.toString();
  return qs ? `/assets?${qs}` : "/assets";
}
