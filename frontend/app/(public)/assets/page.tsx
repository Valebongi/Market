"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import AssetCard from "@/components/assets/AssetCard";
import { AssetCardSkeleton } from "@/components/ui/Skeleton";
import type { Asset } from "@/types";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";

const CATEGORIES = [
  { slug: "software", label: "Software y Apps" },
  { slug: "brand", label: "Marca y Branding" },
  { slug: "design", label: "Diseño" },
  { slug: "business_model", label: "Modelo de Negocio" },
  { slug: "content", label: "Contenido Digital" },
  { slug: "other", label: "Otro" },
];

const LICENSE_TYPES = [
  { value: "all", label: "Todas" },
  { value: "exclusive", label: "Exclusiva" },
  { value: "non_exclusive", label: "No Exclusiva" },
  { value: "temporary", label: "Temporal" },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");

  // Debounce search
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      {/* Page Header */}
      <div className="border-b border-fog-gray dark:border-white/10 bg-white dark:bg-[#0d1117]">
        <div className="container-market py-8">
          <h1 className="text-4xl font-bold text-carbon-gray dark:text-gray-100">
            Explorá Activos Disponibles
          </h1>
          <p className="mt-2 text-lg text-slate-gray dark:text-gray-400">
            Encontrá el activo perfecto para tu próximo proyecto
          </p>
        </div>
      </div>

      <div className="container-market py-8">
        <div className="flex gap-8">
          {/* SIDEBAR – Filtros */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 space-y-6">
              {/* Búsqueda */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar activos..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full h-10 pl-10 pr-4 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-electric-blue dark:focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all"
                  />
                </div>
              </div>

              {/* Categorías */}
              <div>
                <h3 className="text-sm font-semibold text-carbon-gray dark:text-gray-200 mb-3">
                  Categorías
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.slug}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="w-4 h-4 rounded border-fog-gray text-electric-blue focus:ring-electric-blue"
                      />
                      <span className="text-sm text-slate-gray dark:text-gray-400 group-hover:text-carbon-gray dark:group-hover:text-gray-200 transition-colors">
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tipo de Licencia */}
              <div>
                <h3 className="text-sm font-semibold text-carbon-gray dark:text-gray-200 mb-3">
                  Tipo de Licencia
                </h3>
                <div className="space-y-2">
                  {LICENSE_TYPES.map((lt) => (
                    <label
                      key={lt.value}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="licenseType"
                        value={lt.value}
                        checked={licenseType === lt.value}
                        onChange={() => { setLicenseType(lt.value); setPage(1); }}
                        className="w-4 h-4 border-fog-gray text-electric-blue focus:ring-electric-blue"
                      />
                      <span className="text-sm text-slate-gray dark:text-gray-400 group-hover:text-carbon-gray dark:group-hover:text-gray-200 transition-colors">
                        {lt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear */}
              <button
                onClick={clearFilters}
                className="text-sm text-slate-gray dark:text-gray-500 hover:text-soft-coral transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-gray dark:text-gray-400">
                <span className="font-semibold text-carbon-gray dark:text-gray-100">{total}</span> activos encontrados
              </p>
              <div className="flex items-center gap-3">
                <button className="lg:hidden flex items-center gap-2 text-sm text-carbon-gray dark:text-gray-300 border border-fog-gray dark:border-white/10 rounded-lg px-3 py-2 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="text-sm border border-fog-gray dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500"
                >
                  <option value="createdAt">Más recientes</option>
                  <option value="viewCount">Más vistos</option>
                  <option value="requestCount">Más solicitados</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
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
                    className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                      p === page
                        ? "bg-electric-blue text-white"
                        : "text-slate-gray dark:text-gray-400 border border-fog-gray dark:border-white/10 hover:bg-snow-gray dark:hover:bg-white/5"
                    }`}
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
      </div>
    </div>
  );
}
