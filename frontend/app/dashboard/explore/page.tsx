"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import AssetCard from "@/components/assets/AssetCard";
import { AssetCardSkeleton } from "@/components/ui/Skeleton";
import type { Asset } from "@/types";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
import { cn } from "@/lib/utils";
import FeaturedByDigitalAxios from "@/components/landing/FeaturedByDigitalAxios";

const CATEGORIES = [
  { slug: "software", label: "Software y Apps" },
  { slug: "brand", label: "Marca y Branding" },
  { slug: "design", label: "Diseño" },
  { slug: "business_model", label: "Modelo de Negocio" },
  { slug: "content", label: "Contenido Digital" },
  { slug: "project", label: "Proyecto" },
  { slug: "other", label: "Otro" },
];

const LICENSE_TYPES = [
  { value: "all", label: "Cualquier licencia" },
  { value: "exclusive", label: "Exclusiva" },
  { value: "non_exclusive", label: "No Exclusiva" },
  { value: "temporary", label: "Temporal" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Más recientes" },
  { value: "viewCount", label: "Más vistos" },
  { value: "requestCount", label: "Más solicitados" },
];

export default function ExploreMarketplacePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 9,
        sortBy,
        sortOrder: "desc",
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategories.length === 1) params.category = selectedCategories[0];
      if (licenseType !== "all") params.licenseType = licenseType;

      const res = await assetsApi.list(params);
      setAssets((res.data || []).map(mapAsset) as Asset[]);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCategories, licenseType, sortBy]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const toggleCategory = (slug: string) => {
    setPage(1);
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setLicenseType("all");
    setSortBy("createdAt");
    setPage(1);
  };

  const hasFilters = selectedCategories.length > 0 || licenseType !== "all" || !!search;

  return (
    <div className="min-h-full market-grid-bg">
      {/* Nuestros Productos — featured section */}
      <FeaturedByDigitalAxios />

      <div className="p-4 sm:p-8 max-w-wide mx-auto">

        {/* Header */}
        <div className="pb-5 sm:pb-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100 font-display">
            Explorar Marketplace
          </h1>
          <p className="text-sm sm:text-base text-slate-gray dark:text-gray-400 mt-1">
            Encontrá el activo perfecto para tu próximo proyecto
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-gray dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar activos por nombre, descripción o etiqueta..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-12 pl-12 pr-10 border-2 border-fog-gray dark:border-white/10 rounded-xl text-sm bg-white dark:bg-gray-900 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-electric-blue transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-gray hover:text-carbon-gray dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl px-4 py-3 mb-6 flex flex-col gap-3 shadow-sm">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-slate-gray dark:text-gray-500 shrink-0 uppercase tracking-wide mr-1">
              Categoría
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => toggleCategory(cat.slug)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  selectedCategories.includes(cat.slug)
                    ? "bg-electric-blue text-white border-electric-blue"
                    : "bg-snow-gray dark:bg-white/5 text-slate-gray dark:text-gray-400 border-transparent hover:border-electric-blue/40 hover:text-electric-blue dark:hover:text-electric-blue"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Divider + dropdowns row */}
          <div className="flex items-center gap-3 flex-wrap border-t border-fog-gray dark:border-white/10 pt-2.5">
            {/* License */}
            <div className="relative">
              <select
                value={licenseType}
                onChange={(e) => { setLicenseType(e.target.value); setPage(1); }}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs border border-fog-gray dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 focus:outline-none focus:border-electric-blue cursor-pointer"
              >
                {LICENSE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-gray" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs border border-fog-gray dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 focus:outline-none focus:border-electric-blue cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-gray" />
            </div>

            {/* Result count */}
            <p className="text-xs text-slate-gray dark:text-gray-500 ml-auto">
              <span className="font-semibold text-carbon-gray dark:text-gray-200">{total}</span> activos encontrados
            </p>

            {/* Clear */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-gray dark:text-gray-500 hover:text-soft-coral transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Active category chips (when selected, show as removable tags below) */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 -mt-2">
            {selectedCategories.map((slug) => {
              const cat = CATEGORIES.find((c) => c.slug === slug);
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-electric-blue/10 text-electric-blue border border-electric-blue/20"
                >
                  {cat?.label}
                  <button onClick={() => toggleCategory(slug)} className="hover:text-soft-coral transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <AssetCardSkeleton key={i} />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="text-xl font-semibold text-carbon-gray dark:text-gray-100">No encontramos activos</h3>
            <p className="text-sm text-slate-gray dark:text-gray-400 mt-2">Intentá con otros filtros o términos de búsqueda.</p>
            <button onClick={clearFilters} className="mt-4 text-sm text-electric-blue hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
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
              className="px-3 py-2 text-sm text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
