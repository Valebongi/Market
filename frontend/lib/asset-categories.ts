import type { AssetCategory } from "@/types";

/**
 * Fuente única de verdad de las categorías de activos.
 *
 * Antes esta lista estaba duplicada en 5+ archivos (formularios de alta/edición,
 * filtros del marketplace, explore, métricas de admin) y ya hubo drift real:
 * a `explore` le faltaba `project`, a `admin/metrics` le faltaban `brand` y `project`.
 *
 * Cualquier lugar que necesite iterar categorías (selects, chips de filtro,
 * tabs) debe importar `ASSET_CATEGORIES` desde acá en vez de redeclararla.
 *
 * El orden de este array es el orden de presentación en la UI.
 */
export const ASSET_CATEGORIES = [
  { value: "software", label: "Software y Apps" },
  { value: "design", label: "Diseño" },
  { value: "business_model", label: "Modelo de Negocio" },
  { value: "content", label: "Contenido Digital" },
  { value: "brand", label: "Marca y Branding" },
  { value: "project", label: "Proyecto" },
  { value: "other", label: "Otro" },
] as const satisfies ReadonlyArray<{ value: AssetCategory; label: string }>;

type DeclaredCategory = (typeof ASSET_CATEGORIES)[number]["value"];

/**
 * Guarda de exhaustividad: si se agrega un miembro a `AssetCategory` en
 * `types/index.ts` y no se lo declara acá arriba, esta línea deja de compilar.
 * No tiene efecto en runtime.
 */
type MissingCategories = Exclude<AssetCategory, DeclaredCategory>;

const _assertAllCategoriesDeclared: [MissingCategories] extends [never]
  ? true
  : ["Falta declarar en ASSET_CATEGORIES:", MissingCategories] = true;
void _assertAllCategoriesDeclared;

/** Sólo los `value`, para validar querystrings o construir filtros. */
export const ASSET_CATEGORY_VALUES: readonly AssetCategory[] =
  ASSET_CATEGORIES.map((c) => c.value);

/**
 * Etiquetas en español, derivadas de `ASSET_CATEGORIES`.
 * Tipado como `Record<AssetCategory, string>` (no `Record<string, string>`)
 * para que una categoría faltante sea error de compilación y no `undefined`
 * silencioso en runtime.
 */
export const ASSET_TYPE_LABELS: Record<AssetCategory, string> =
  Object.fromEntries(
    ASSET_CATEGORIES.map((c) => [c.value, c.label]),
  ) as Record<AssetCategory, string>;

/** Etiqueta segura para un valor que puede venir sucio del backend. */
export function getAssetCategoryLabel(value: string): string {
  return ASSET_TYPE_LABELS[value as AssetCategory] ?? value;
}

/** Type guard para validar un string arbitrario (querystring, form). */
export function isAssetCategory(value: string): value is AssetCategory {
  return (ASSET_CATEGORY_VALUES as readonly string[]).includes(value);
}
