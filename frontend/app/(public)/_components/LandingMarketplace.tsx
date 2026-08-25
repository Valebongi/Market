"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, ChevronDown, ArrowRight, Upload } from "lucide-react";
import Link from "next/link";
import AssetCard from "@/components/assets/AssetCard";
import { AssetCardSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import type { Asset, AssetCategory } from "@/types";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
import { cn } from "@/lib/utils";
// Fuente única de verdad. Redeclarar la lista acá fue lo que dejó `project`
// fuera de los chips y volvió invisibles los activos de esa categoría.
import { ASSET_CATEGORIES, getAssetCategoryLabel } from "@/lib/asset-categories";
import FeaturedByDigitalAxios from "@/components/landing/FeaturedByDigitalAxios";

/**
 * Sólo el color de cada chip vive acá: los `value` y los labels salen de
 * `ASSET_CATEGORIES`. Al tiparlo como `Record<AssetCategory, string>`, agregar
 * una categoría nueva sin darle color rompe el build en vez de renderizar un
 * chip sin estilo.
 */
const CATEGORY_CHIP_COLORS: Record<AssetCategory, string> = {
  software:       "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  design:         "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  brand:          "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
  business_model: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  content:        "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  project:        "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  other:          "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
};

const SORT_OPTIONS = [
  { value: "createdAt",    label: "Más recientes" },
  { value: "viewCount",    label: "Más vistos" },
  { value: "requestCount", label: "Más solicitados" },
];

const LICENSE_TYPES = [
  { value: "all",          label: "Cualquier licencia" },
  { value: "exclusive",    label: "Exclusiva" },
  { value: "non_exclusive", label: "No exclusiva" },
  { value: "temporary",   label: "Temporal" },
];

export default function LandingMarketplace() {

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [licenseType, setLicenseType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [loadError, setLoadError] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params: Record<string, string | number> = { page, limit: 12, sortBy, sortOrder: "desc" };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;
      if (licenseType !== "all") params.licenseType = licenseType;

      const res = await assetsApi.list(params);
      setAssets((res.data || []).map(mapAsset) as Asset[]);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      // Sin esto un gateway caído se ve exactamente igual que un catálogo vacío.
      setAssets([]);
      setTotal(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCategory, licenseType, sortBy]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory((prev) => (prev === slug ? "" : slug));
    setPage(1);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => {
    setSearch(""); setSelectedCategory(""); setLicenseType("all"); setSortBy("createdAt"); setPage(1);
  };

  /**
   * Distingue "el filtro no devolvió nada" de "el catálogo está vacío".
   * Usa `debouncedSearch` y no `search` para que el copy del estado vacío no
   * cambie mientras el usuario todavía está tipeando.
   */
  const hasFilters =
    !!selectedCategory || licenseType !== "all" || !!debouncedSearch;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f0f9ff] via-white to-white dark:from-[#0d1a2e] dark:via-[#0d1117] dark:to-[#0d1117] pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-fog-gray dark:border-white/10">
        {/* Soft background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-electric-blue/8 rounded-full blur-[100px]" />
          <div className="absolute top-10 -left-20 w-72 h-72 bg-emerald-400/8 rounded-full blur-[80px]" />
        </div>

        <div className="relative container-market px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-electric-blue/8 border border-electric-blue/20 rounded-full px-4 py-1.5 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-blue opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-blue" />
            </span>
            <span className="text-xs font-semibold text-electric-blue tracking-wide">Marketplace de licencias · Argentina</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-carbon-gray dark:text-white leading-[1.1] tracking-tight font-display">
            Activos intelectuales<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-violet-500"> listos para licenciar</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-gray dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Software, diseños, marcas y modelos de negocio probados.<br className="hidden sm:block" />
            Encontrá el activo perfecto para tu próximo proyecto.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-gray dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscá por nombre, tecnología o industria…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-14 pl-12 pr-12 text-base border-2 border-fog-gray dark:border-white/15 rounded-2xl bg-white dark:bg-gray-900 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-600 focus:outline-none focus:border-electric-blue dark:focus:border-electric-blue transition-all shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-none"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-4 p-1 rounded-lg text-slate-gray hover:text-carbon-gray dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {ASSET_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                  selectedCategory === cat.value
                    ? "bg-electric-blue text-white border-electric-blue shadow-sm"
                    : `${CATEGORY_CHIP_COLORS[cat.value]} dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-white/10`
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────
          El `id` no es decorativo: el navbar y el footer enlazan
          `/#como-funciona` desde TODAS las páginas del sitio y hasta ahora ese
          ancla no existía — el único `id` de la home era `main-content`, así
          que el enlace no llevaba a ningún lado.

          El copy es deliberadamente literal sobre lo que la plataforma hace y
          lo que no. No hay pagos, no hay verificación de titularidad y no hay
          contratos firmados acá: prometerlo sería un riesgo legal real. */}
      <section
        id="como-funciona"
        aria-labelledby="como-funciona-title"
        className="scroll-mt-24 border-b border-fog-gray dark:border-white/10 bg-white dark:bg-[#0d1117]"
      >
        <div className="container-market px-4 sm:px-6 py-12 sm:py-14">
          <h2
            id="como-funciona-title"
            className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100 text-center"
          >
            Cómo funciona
          </h2>
          <p className="mt-3 text-center text-base text-slate-gray dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Da Vinci Inventa es el lugar donde quien tiene un activo intelectual
            —un software, un diseño, una marca, un modelo de negocio— se
            encuentra con quien lo quiere usar. Nosotros los conectamos; el
            acuerdo lo cierran ustedes.
          </p>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-fog-gray dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">
                Si tenés algo para licenciar
              </h3>
              <ol className="mt-4 space-y-3">
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">1. Publicá el activo.</span>{" "}
                  Contá qué es, qué tipo de licencia ofrecés y qué usos permitís.
                </li>
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">2. Recibí solicitudes.</span>{" "}
                  Quien esté interesado te escribe explicando para qué lo quiere.
                </li>
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">3. Negociá vos.</span>{" "}
                  Conversan las condiciones y decidís a quién le decís que sí.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-fog-gray dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">
                Si buscás algo para tu proyecto
              </h3>
              <ol className="mt-4 space-y-3">
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">1. Explorá el catálogo.</span>{" "}
                  Filtrá por categoría y por tipo de licencia hasta dar con lo que necesitás.
                </li>
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">2. Solicitá la licencia.</span>{" "}
                  Le mandás tu pedido al titular directamente desde la ficha del activo.
                </li>
                <li className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-carbon-gray dark:text-gray-200">3. Acuerdan las condiciones.</span>{" "}
                  Si hay acuerdo, lo cierran entre ustedes con sus propios términos.
                </li>
              </ol>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-gray dark:text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Para que quede claro: la plataforma pone en contacto a las partes y
            aloja la conversación. No verificamos la titularidad de los activos,
            no procesamos pagos y no somos parte del contrato que ustedes firmen.
          </p>
        </div>
      </section>

      {/* ── NUESTROS PRODUCTOS ───────────────────────────────────────── */}
      <FeaturedByDigitalAxios />

      {/* ── BROWSE BAR + GRID ────────────────────────────────────────── */}
      <div ref={gridRef} className="market-grid-bg">
      <div className="container-market px-4 sm:px-6 py-8">

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <p className="text-sm text-slate-gray dark:text-gray-400 mr-auto">
            {loading ? (
              <span className="inline-block w-24 h-4 bg-fog-gray dark:bg-white/10 rounded animate-pulse" />
            ) : (
              <><span className="font-semibold text-carbon-gray dark:text-gray-100">{total}</span> activos disponibles</>
            )}
          </p>

          {/* License filter */}
          <div className="relative">
            <select
              value={licenseType}
              onChange={(e) => { setLicenseType(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-fog-gray dark:border-white/10 rounded-lg bg-white dark:bg-gray-900 text-carbon-gray dark:text-gray-200 focus:outline-none focus:border-electric-blue cursor-pointer"
            >
              {LICENSE_TYPES.map((lt) => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-gray" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-fog-gray dark:border-white/10 rounded-lg bg-white dark:bg-gray-900 text-carbon-gray dark:text-gray-200 focus:outline-none focus:border-electric-blue cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-gray" />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-gray dark:text-gray-500 hover:text-soft-coral transition-colors border border-fog-gray dark:border-white/10 rounded-lg px-3 py-2"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Active category tag */}
        {selectedCategory && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sm text-slate-gray dark:text-gray-400">Categoría:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
              {getAssetCategoryLabel(selectedCategory)}
              <button onClick={() => { setSelectedCategory(""); setPage(1); }} className="hover:text-soft-coral transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 12 }).map((_, i) => <AssetCardSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <EmptyState
            size="lg"
            iconStyle="bare"
            icon="⚠️"
            title="No pudimos cargar el catálogo"
            description="Hubo un problema de conexión con el servidor. Probá de nuevo en unos segundos."
            action={{ label: "Reintentar", onClick: fetchAssets, variant: "link" }}
          />
        ) : assets.length === 0 && hasFilters ? (
          <EmptyState
            size="lg"
            iconStyle="bare"
            icon="🔍"
            title="No encontramos activos con esos filtros"
            description="Probá con otros términos de búsqueda o eliminá los filtros activos."
            action={{ label: "Ver todos los activos", onClick: clearFilters, variant: "link" }}
          />
        ) : assets.length === 0 ? (
          <EmptyState
            size="lg"
            iconStyle="bare"
            icon="🌱"
            title="Todavía no hay activos publicados"
            description="El catálogo está arrancando. Si tenés un activo intelectual para licenciar, podés ser el primero en publicarlo."
            action={{ label: "Publicar mi activo", href: "/register", variant: "link" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-9 h-9 text-sm rounded-lg transition-colors",
                  p === page
                    ? "bg-electric-blue text-white"
                    : "text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 hover:bg-snow-gray dark:hover:bg-white/5"
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
      </div>

      {/* ── CTA STRIP ────────────────────────────────────────────────── */}
      <section className="border-t border-fog-gray dark:border-white/10 bg-gradient-to-r from-blue-50 via-white to-emerald-50 dark:from-[#0d1a2e] dark:via-[#0d1117] dark:to-[#0a1f1a]">
        <div className="container-market px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-electric-blue flex items-center justify-center text-white shadow-lg shrink-0">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-carbon-gray dark:text-gray-100">¿Tenés un activo para publicar?</p>
              <p className="text-sm text-slate-gray dark:text-gray-400 mt-0.5">
                Monetizá tus creaciones conectándote con emprendedores que las necesitan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/register">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-electric-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                Publicar mi activo <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login" className="text-sm text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 transition-colors">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
