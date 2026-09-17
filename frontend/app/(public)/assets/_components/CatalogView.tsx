import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AssetCard from "@/components/assets/AssetCard";
import EmptyState from "@/components/ui/EmptyState";
import { AssetCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
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
import { SITE_URL } from "@/lib/site";
import { serializeJsonLd } from "@/lib/security";
import CatalogFilterPanel from "./CatalogFilterPanel";
import CatalogSearchInput from "./CatalogSearchInput";
import CatalogErrorState from "./CatalogErrorState";
import CatalogSortSelect from "./CatalogSortSelect";
import {
  catalogHref,
  CATALOG_PARAM_KEYS,
  CATALOG_SORT_VALUES,
  DEFAULT_SORT,
  LICENSE_FILTERS,
  LICENSE_VALUES,
  type CatalogParams,
} from "./catalog";
import { landingForCategory, type CategoryLanding } from "./category-landings";

/**
 * CATÁLOGO PÚBLICO — Server Component compartido por `/assets` y por las
 * landings de categoría (`/assets/<slug>`).
 *
 * El listado se arma en el servidor y el estado vive en la querystring: el HTML
 * trae los activos y sus enlaces, las categorías y la paginación son `<Link>`
 * rastreables, y `/assets?search=<tag>` o `?ownerId=` filtran de verdad.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 9;

const CATALOG_TITLE = "Catálogo de activos intelectuales";
const CATALOG_H1 = "Catálogo de activos intelectuales para licenciar";
const CATALOG_DESCRIPTION =
  "Explorá activos intelectuales para licenciar: software, diseños, marcas, contenido y modelos de negocio que sus titulares publican en Argentina.";

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

// `cache` + clave serializada: metadata y página comparten un solo request por render.
const loadCatalog = cache(async (key: string): Promise<CatalogResult> => {
  try {
    const res = await assetsApi.list(JSON.parse(key));
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
});

/** Ventana de hasta 5 páginas centrada en la actual. */
function pageWindow(current: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages);
  const start = Math.max(
    1,
    Math.min(current - Math.floor(size / 2), totalPages - size + 1),
  );
  return Array.from({ length: size }, (_, i) => start + i);
}

/** Normaliza la URL. En una landing la categoría sale del path, no de la querystring. */
export function parseCatalogParams(sp: SearchParams, landing?: CategoryLanding) {
  const rawCategory = landing ? landing.category : first(sp.category);
  const category = isAssetCategory(rawCategory) ? rawCategory : "";

  const rawLicense = first(sp.licenseType);
  const licenseType = LICENSE_VALUES.includes(rawLicense) ? rawLicense : "";

  const rawSort = first(sp.sortBy);
  const sortBy = CATALOG_SORT_VALUES.includes(rawSort) ? rawSort : DEFAULT_SORT;

  const search = first(sp.search).slice(0, 120);
  const ownerId = first(sp.ownerId).slice(0, 64);

  const parsedPage = Number.parseInt(first(sp.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Los valores por defecto se omiten para que el catálogo sin filtros sea la URL pelada.
  const activeParams: CatalogParams = {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(licenseType ? { licenseType } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(sortBy !== DEFAULT_SORT ? { sortBy } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  };

  const apiKey = JSON.stringify({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder: "desc",
    // El catálogo público sólo muestra publicados.
    status: "published",
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(licenseType ? { licenseType } : {}),
    ...(ownerId ? { ownerId } : {}),
  });

  return { category, licenseType, sortBy, search, ownerId, page, activeParams, apiKey };
}

/**
 * Toda combinación de filtros es `noindex, follow`: `follow` conserva el
 * rastreo hacia los activos y no se declara canonical, que junto a `noindex`
 * serían señales contradictorias. En una landing, la categoría no cuenta como
 * filtro.
 */
function hasFilters(sp: SearchParams, landing?: CategoryLanding): boolean {
  return CATALOG_PARAM_KEYS.some(
    (key) => !(landing && key === "category") && first(sp[key]) !== "",
  );
}

export async function catalogMetadata(
  sp: SearchParams,
  landing?: CategoryLanding,
): Promise<Metadata> {
  const url = landing ? `${SITE_URL}/assets/${landing.slug}` : `${SITE_URL}/assets`;
  const title = landing ? landing.title : CATALOG_TITLE;
  const description = landing ? landing.description : CATALOG_DESCRIPTION;

  let indexable = !hasFilters(sp, landing);
  // Una landing sin activos publicados es thin content: `noindex` hasta que tenga al menos uno.
  if (indexable && landing) {
    const { total, failed } = await loadCatalog(parseCatalogParams(sp, landing).apiKey);
    indexable = !failed && total > 0;
  }

  return {
    title,
    description,
    ...(indexable
      ? { alternates: { canonical: url } }
      : { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${title} | Da Vinci Inventa`,
      description,
      url,
      type: "website",
      images: [{ url: "/Logo DaVinci.png", width: 512, height: 512, alt: "Da Vinci Inventa" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Da Vinci Inventa`,
      description,
      images: ["/Logo DaVinci.png"],
    },
  };
}

function categoryLinkLabel(category: string, fallback: string): string {
  return landingForCategory(category)?.linkLabel ?? fallback;
}

function ResultsSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-40 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

async function CatalogResults({
  apiKey,
  activeParams,
  sortBy,
  page,
  category,
  filtered,
  landing,
}: {
  apiKey: string;
  activeParams: CatalogParams;
  sortBy: string;
  page: number;
  category: string;
  filtered: boolean;
  landing?: CategoryLanding;
}) {
  const { assets, total, totalPages, failed } = await loadCatalog(apiKey);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-slate-gray dark:text-gray-400">
          <span className="font-semibold text-carbon-gray dark:text-gray-100">
            {total}
          </span>{" "}
          {total === 1 ? "activo encontrado" : "activos encontrados"}
          {category && !landing ? (
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
      ) : assets.length === 0 && filtered ? (
        <EmptyState
          size="lg"
          iconStyle="bare"
          icon="🔍"
          title="No encontramos activos con esos filtros"
          description="Probá con otros términos de búsqueda o quitá alguno de los filtros aplicados."
          action={{
            label: "Limpiar filtros",
            href: landing ? `/assets/${landing.slug}` : "/assets",
            variant: "link",
          }}
        />
      ) : assets.length === 0 ? (
        <EmptyState
          size="lg"
          iconStyle="bare"
          icon="🌱"
          title={landing ? "Todavía no hay activos publicados en esta categoría" : "Todavía no hay activos publicados"}
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
    </>
  );
}

export default function CatalogView({
  sp,
  landing,
}: {
  sp: SearchParams;
  landing?: CategoryLanding;
}) {
  const { category, licenseType, sortBy, search, ownerId, page, activeParams, apiKey } =
    parseCatalogParams(sp, landing);

  const filtered = !!search || !!licenseType || !!ownerId || (!landing && !!category);
  const pageUrl = landing ? `${SITE_URL}/assets/${landing.slug}` : `${SITE_URL}/assets`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Catálogo", item: `${SITE_URL}/assets` },
      ...(landing
        ? [{ "@type": "ListItem", position: 3, name: landing.linkLabel, item: pageUrl }]
        : []),
    ],
  };

  const H2 = "text-2xl font-bold text-carbon-gray dark:text-gray-100";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {/* Cabecera */}
      <div className="border-b border-fog-gray dark:border-white/10 bg-white dark:bg-[#0d1117]">
        <div className="container-market py-8">
          {landing && (
            <nav aria-label="Migas de pan" className="mb-3 text-sm text-slate-gray dark:text-gray-400">
              <Link href="/assets" className="hover:text-electric-blue hover:underline">
                Catálogo
              </Link>
              <span aria-hidden="true"> / </span>
              <span className="text-carbon-gray dark:text-gray-200">{landing.linkLabel}</span>
            </nav>
          )}
          <h1 className="text-4xl font-bold text-carbon-gray dark:text-gray-100">
            {landing ? landing.h1 : CATALOG_H1}
          </h1>
          {landing ? (
            landing.intro.map((p) => (
              <p key={p} className="mt-4 max-w-3xl text-base text-slate-gray dark:text-gray-400 leading-relaxed">
                {p}
              </p>
            ))
          ) : (
            <p className="mt-4 max-w-3xl text-base text-slate-gray dark:text-gray-400 leading-relaxed">
              Acá listamos software, diseños, marcas, contenido y modelos de
              negocio que sus titulares ofrecen para licenciar. Filtrá por
              categoría o por tipo de licencia, entrá al activo que te interese y
              pedile la licencia a quien lo publicó. Da Vinci Inventa los conecta:
              la negociación y el acuerdo los cierran ustedes.
            </p>
          )}
        </div>
      </div>

      <div className="container-market py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* FILTROS — renderizados en el servidor, con enlaces reales */}
          <CatalogFilterPanel>
            <h2 className="text-base font-semibold text-carbon-gray dark:text-gray-100">
              {landing ? landing.filtersHeading : "Filtrá el catálogo"}
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
                        {categoryLinkLabel(cat.value, cat.label)}
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
              <p className="mt-3 px-3 text-xs text-slate-gray dark:text-gray-400">
                ¿No sabés cuál elegir?{" "}
                <Link href="/como-funciona" className="text-electric-blue underline underline-offset-2 hover:no-underline">
                  Mirá qué es cada tipo de licencia
                </Link>
              </p>
            </nav>

            {filtered && (
              <Link
                href={landing ? `/assets/${landing.slug}` : "/assets"}
                className="inline-block text-sm text-slate-gray dark:text-gray-400 hover:text-soft-coral transition-colors"
              >
                Limpiar filtros
              </Link>
            )}
          </CatalogFilterPanel>

          {/* LISTADO — solo esto espera a la API; el resto sale en orden en el HTML inicial. */}
          <section aria-labelledby="listado-activos" className="flex-1 min-w-0">
            <h2 id="listado-activos" className="sr-only">
              {landing ? `Activos: ${landing.linkLabel.toLowerCase()}` : "Activos disponibles"}
            </h2>
            <Suspense key={apiKey} fallback={<ResultsSkeleton />}>
              <CatalogResults
                apiKey={apiKey}
                activeParams={activeParams}
                sortBy={sortBy}
                page={page}
                category={category}
                filtered={filtered}
                landing={landing}
              />
            </Suspense>
          </section>
        </div>
      </div>

      {/* Contenido propio: le explica la página a quien llega de un buscador. */}
      <section className="border-t border-fog-gray dark:border-white/10 bg-snow-gray/50 dark:bg-white/[0.02]">
        <div className="container-market py-12">
          {landing && (
            <div className="mb-12 grid gap-8 lg:grid-cols-2">
              {landing.sections.map((s) => (
                <div key={s.heading}>
                  <h2 className={H2}>{s.heading}</h2>
                  {s.paragraphs.map((p) => (
                    <p key={p} className="mt-3 text-base text-slate-gray dark:text-gray-400 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
              {landing.guide && (
                <Link href={landing.guide.href} className="text-sm font-semibold text-electric-blue hover:underline">
                  {landing.guide.label}
                </Link>
              )}
            </div>
          )}

          <h2 className={H2}>
            {landing ? landing.howToHeading : "Cómo funciona pedir una licencia"}
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
          <Link
            href="/como-funciona"
            className="mt-6 inline-block text-sm font-semibold text-electric-blue hover:underline"
          >
            Conocé cómo licenciar propiedad intelectual paso a paso
          </Link>

          <h2 className={cn(H2, "mt-10")}>
            {landing ? "Otras categorías del catálogo" : "Categorías del catálogo"}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ASSET_CATEGORIES.filter((cat) => cat.value !== landing?.category).map((cat) => (
              <li key={cat.value}>
                <Link
                  href={catalogHref({ category: cat.value })}
                  className="inline-block px-4 py-2 rounded-full text-sm font-medium border border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-300 hover:border-electric-blue hover:text-electric-blue transition-colors"
                >
                  {categoryLinkLabel(cat.value, cat.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
