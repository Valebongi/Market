import Link from "next/link";
import AssetCard from "@/components/assets/AssetCard";
import EmptyState from "@/components/ui/EmptyState";
import type { Asset } from "@/types";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
// Fuente única de verdad. Redeclarar la lista acá fue lo que dejó `project`
// fuera del filtro y volvió invisibles los activos de esa categoría.
import {
  ASSET_CATEGORIES,
  getAssetCategoryLabel,
  isAssetCategory,
} from "@/lib/asset-categories";
import { cn } from "@/lib/utils";
import CatalogFilterPanel from "./_components/CatalogFilterPanel";
import CatalogSearchInput from "./_components/CatalogSearchInput";
import CatalogErrorState from "./_components/CatalogErrorState";
import CatalogSortSelect from "./_components/CatalogSortSelect";
import {
  catalogHref,
  CATALOG_SORT_VALUES,
  DEFAULT_SORT,
  LICENSE_FILTERS,
  LICENSE_VALUES,
  type CatalogParams,
} from "./_components/catalog";

/**
 * CATÁLOGO PÚBLICO — Server Component.
 *
 * Esta página era `"use client"`: pedía los activos en un `useEffect` y
 * guardaba los filtros en `useState`. El HTML que recibía un buscador tenía
 * 120 palabras, cero enlaces a activos, cero enlaces a categorías y el texto
 * literal "0 activos encontrados" — y iba a seguir diciendo eso con el catálogo
 * lleno, porque `useEffect` no corre en el servidor.
 *
 * Ahora el listado se arma en el servidor y el estado vive en la querystring.
 * Tres consecuencias, en este orden de importancia:
 *
 * 1. El HTML de la respuesta trae los activos y sus enlaces. Es lo que hace
 *    descubrible el inventario sin depender de que Google ejecute JavaScript en
 *    una segunda pasada.
 * 2. Las categorías son `<Link>` y no `<button>`: existe por fin una ruta
 *    rastreable desde el catálogo hacia cada faceta.
 * 3. `/assets?search=<tag>` (etiquetas del detalle) y `/assets?ownerId=...`
 *    (home) por fin filtran. Eran enlaces rotos que no parecían rotos.
 *
 * La interactividad que necesita estado de cliente —el debounce del buscador,
 * el orden y el panel colapsable en mobile— vive en `_components/` y recibe los
 * filtros por props. Los filtros en sí los renderiza el servidor.
 *
 * Sobre el canonical: `assets/layout.tsx` fija `canonical` en `/assets` y esta
 * página no lo sobreescribe. Toda combinación de filtros canonicaliza al
 * catálogo pelado. Es a propósito: conserva el rastreo de las facetas sin
 * indexar la combinatoria.
 */

const PAGE_SIZE = 9;

/** `?a=1&a=2` llega como array. Nos quedamos con el primero y descartamos el resto. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

interface CatalogResult {
  assets: Asset[];
  total: number;
  totalPages: number;
  failed: boolean;
}

async function loadCatalog(
  params: Record<string, string | number>,
): Promise<CatalogResult> {
  try {
    const res = await assetsApi.list(params);
    return {
      assets: (res.data || []).map(mapAsset) as Asset[],
      total: res.total || 0,
      totalPages: res.totalPages || 1,
      failed: false,
    };
  } catch {
    // Sin esto un gateway caído se ve exactamente igual que un catálogo vacío.
    return { assets: [], total: 0, totalPages: 1, failed: true };
  }
}

/** Ventana de hasta 5 páginas centrada en la actual. */
function pageWindow(current: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages);
  const start = Math.max(
    1,
    Math.min(current - Math.floor(size / 2), totalPages - size + 1),
  );
  return Array.from({ length: size }, (_, i) => start + i);
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // Todo lo que viene de la URL se valida contra la lista cerrada
  // correspondiente. Un `?category=<basura>` tiene que caer en "sin filtro",
  // no viajar al backend y volver como 400.
  const rawCategory = first(sp.category);
  const category = isAssetCategory(rawCategory) ? rawCategory : "";

  const rawLicense = first(sp.licenseType);
  const licenseType = LICENSE_VALUES.includes(rawLicense) ? rawLicense : "";

  const rawSort = first(sp.sortBy);
  const sortBy = CATALOG_SORT_VALUES.includes(rawSort) ? rawSort : DEFAULT_SORT;

  const search = first(sp.search).slice(0, 120);
  const ownerId = first(sp.ownerId).slice(0, 64);

  const parsedPage = Number.parseInt(first(sp.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Estado normalizado del catálogo. Los valores por defecto se omiten para que
  // el catálogo sin filtros sea `/assets` pelado y no `/assets?sortBy=createdAt`.
  const activeParams: CatalogParams = {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(licenseType ? { licenseType } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(sortBy !== DEFAULT_SORT ? { sortBy } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  };

  const { assets, total, totalPages, failed } = await loadCatalog({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder: "desc",
    // El catálogo público sólo muestra publicados. `GET /assets` no filtra por
    // estado si no se lo pide, así que sin esto un borrador podía entrar al
    // HTML indexable del listado.
    status: "published",
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(licenseType ? { licenseType } : {}),
    ...(ownerId ? { ownerId } : {}),
  });

  const hasFilters = !!search || !!category || !!licenseType || !!ownerId;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      {/* Cabecera */}
      <div className="border-b border-fog-gray dark:border-white/10 bg-white dark:bg-[#0d1117]">
        <div className="container-market py-8">
          <h1 className="text-4xl font-bold text-carbon-gray dark:text-gray-100">
            Explorá Activos Disponibles
          </h1>
          <p className="mt-2 text-lg text-slate-gray dark:text-gray-400">
            Encontrá el activo perfecto para tu próximo proyecto
          </p>
          <p className="mt-4 max-w-3xl text-base text-slate-gray dark:text-gray-400 leading-relaxed">
            Acá listamos software, diseños, marcas, contenido y modelos de
            negocio que sus titulares ofrecen para licenciar. Filtrá por
            categoría o por tipo de licencia, entrá al activo que te interese y
            pedile la licencia a quien lo publicó. Da Vinci Inventa los conecta:
            la negociación y el acuerdo los cierran ustedes.
          </p>
        </div>
      </div>

      <div className="container-market py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* FILTROS — renderizados en el servidor, con enlaces reales */}
          <CatalogFilterPanel>
            <h2 className="text-base font-semibold text-carbon-gray dark:text-gray-100">
              Filtros
            </h2>

            <CatalogSearchInput value={search} params={activeParams} />

            <nav aria-labelledby="filtro-categorias">
              <h3
                id="filtro-categorias"
                className="text-sm font-semibold text-carbon-gray dark:text-gray-200 mb-3"
              >
                Categorías
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={catalogHref(activeParams, {
                      category: undefined,
                      page: undefined,
                    })}
                    aria-current={!category ? "true" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                      !category
                        ? "bg-electric-blue/10 text-electric-blue font-medium"
                        : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200",
                    )}
                  >
                    Todas las categorías
                  </Link>
                </li>
                {ASSET_CATEGORIES.map((cat) => {
                  const isActive = category === cat.value;
                  return (
                    <li key={cat.value}>
                      <Link
                        href={catalogHref(activeParams, {
                          category: isActive ? undefined : cat.value,
                          page: undefined,
                        })}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-electric-blue/10 text-electric-blue font-medium"
                            : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200",
                        )}
                      >
                        {cat.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <nav aria-labelledby="filtro-licencias">
              <h3
                id="filtro-licencias"
                className="text-sm font-semibold text-carbon-gray dark:text-gray-200 mb-3"
              >
                Tipo de Licencia
              </h3>
              <ul className="space-y-1">
                {LICENSE_FILTERS.map((lt) => {
                  const isActive = licenseType === lt.value;
                  return (
                    <li key={lt.value || "all"}>
                      <Link
                        href={catalogHref(activeParams, {
                          licenseType: lt.value || undefined,
                          page: undefined,
                        })}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-electric-blue/10 text-electric-blue font-medium"
                            : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200",
                        )}
                      >
                        {lt.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {hasFilters && (
              <Link
                href="/assets"
                className="inline-block text-sm text-slate-gray dark:text-gray-500 hover:text-soft-coral transition-colors"
              >
                Limpiar filtros
              </Link>
            )}
          </CatalogFilterPanel>

          {/* LISTADO */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-sm text-slate-gray dark:text-gray-400">
                <span className="font-semibold text-carbon-gray dark:text-gray-100">
                  {total}
                </span>{" "}
                {total === 1 ? "activo encontrado" : "activos encontrados"}
                {category ? (
                  <>
                    {" en "}
                    <span className="font-medium text-carbon-gray dark:text-gray-200">
                      {getAssetCategoryLabel(category)}
                    </span>
                  </>
                ) : null}
              </p>
              <CatalogSortSelect value={sortBy} params={activeParams} />
            </div>

            {failed ? (
              <CatalogErrorState />
            ) : assets.length === 0 && hasFilters ? (
              <EmptyState
                size="lg"
                iconStyle="bare"
                icon="🔍"
                title="No encontramos activos con esos filtros"
                description="Probá con otros términos de búsqueda o quitá alguno de los filtros aplicados."
                action={{
                  label: "Limpiar filtros",
                  href: "/assets",
                  variant: "link",
                }}
              />
            ) : assets.length === 0 ? (
              <EmptyState
                size="lg"
                iconStyle="bare"
                icon="🌱"
                title="Todavía no hay activos publicados"
                description="El catálogo está arrancando. Si tenés un activo intelectual para licenciar, podés ser el primero en publicarlo."
                action={{ label: "Publicar mi activo", href: "/register" }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}

            {/* Paginación con `<Link>` reales: es el camino por el que se
                descubre el inventario que no entra en la primera página. */}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación"
                className="mt-12 flex items-center justify-center gap-2"
              >
                {page > 1 && (
                  <Link
                    href={catalogHref(activeParams, {
                      page: page - 1 > 1 ? String(page - 1) : undefined,
                    })}
                    rel="prev"
                    className="px-3 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {pageWindow(page, totalPages).map((p) => (
                  <Link
                    key={p}
                    href={catalogHref(activeParams, {
                      page: p > 1 ? String(p) : undefined,
                    })}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "w-9 h-9 inline-flex items-center justify-center text-sm rounded-lg transition-colors",
                      p === page
                        ? "bg-electric-blue text-white"
                        : "text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 hover:bg-snow-gray dark:hover:bg-white/5",
                    )}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={catalogHref(activeParams, { page: String(page + 1) })}
                    rel="next"
                    className="px-3 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Contenido propio: le explica el catálogo a quien llega de un buscador y
          deja un segundo bloque de enlaces a las categorías. Sin prometer nada
          que la plataforma no haga. */}
      <section className="border-t border-fog-gray dark:border-white/10 bg-snow-gray/50 dark:bg-white/[0.02]">
        <div className="container-market py-12">
          <h2 className="text-2xl font-bold text-carbon-gray dark:text-gray-100">
            Cómo funciona pedir una licencia
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-carbon-gray dark:text-gray-200">
                1. Buscá el activo
              </h3>
              <p className="mt-1.5 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                Filtrá por categoría y por tipo de licencia. Cada ficha dice qué
                es el activo, qué licencia ofrece el titular y qué usos permite.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-carbon-gray dark:text-gray-200">
                2. Pedí la licencia
              </h3>
              <p className="mt-1.5 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                Desde la ficha del activo le mandás tu solicitud a quien lo
                publicó, contándole para qué lo querés usar.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-carbon-gray dark:text-gray-200">
                3. Acuerdan entre ustedes
              </h3>
              <p className="mt-1.5 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                Conversan las condiciones por la plataforma. El acuerdo y el pago
                los cierran ustedes por fuera: Da Vinci Inventa no interviene.
              </p>
            </div>
          </div>

          <h2 className="mt-10 text-2xl font-bold text-carbon-gray dark:text-gray-100">
            Categorías del catálogo
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ASSET_CATEGORIES.map((cat) => (
              <li key={cat.value}>
                <Link
                  href={`/assets?category=${cat.value}`}
                  className="inline-block px-4 py-2 rounded-full text-sm font-medium border border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-300 hover:border-electric-blue hover:text-electric-blue transition-colors"
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
