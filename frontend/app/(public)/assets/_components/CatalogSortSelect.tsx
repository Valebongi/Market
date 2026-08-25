"use client";

import { useRouter } from "next/navigation";
import {
  catalogHref,
  CATALOG_SORT_OPTIONS,
  DEFAULT_SORT,
  type CatalogParams,
} from "./catalog";

/**
 * Selector de orden.
 *
 * El orden NO genera una URL indexable distinta: los mismos activos en otro
 * orden son la misma página. Por eso es un `<select>` que navega y no una lista
 * de `<Link>` como las categorías — no hay nada que Google gane rastreando las
 * tres variantes.
 */
export default function CatalogSortSelect({
  value,
  params,
}: {
  value: string;
  params: CatalogParams;
}) {
  const router = useRouter();

  return (
    <>
      <label htmlFor="catalog-sort" className="sr-only">
        Ordenar activos
      </label>
      <select
        id="catalog-sort"
        value={value}
        onChange={(e) =>
          router.push(
            catalogHref(params, {
              sortBy:
                e.target.value === DEFAULT_SORT ? undefined : e.target.value,
              page: undefined,
            }),
            { scroll: false },
          )
        }
        className="text-sm border border-fog-gray dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500"
      >
        {CATALOG_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
