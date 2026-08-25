"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useSavedAssets } from "@/lib/saved-assets-context";
import { assetsService, mapAsset } from "@/services/assets.service";
import AssetCard from "@/components/assets/AssetCard";
import EmptyState from "@/components/ui/EmptyState";
import type { Asset } from "@/types";

export default function SavedAssetsPage() {
  const { savedIds, loading: idsLoading } = useSavedAssets();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (idsLoading) return;
    if (savedIds.size === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([...savedIds].map((id) => assetsService.get(id).catch(() => null)))
      .then((results) => {
        setAssets(results.filter(Boolean).map((r) => mapAsset(r!)));
      })
      .finally(() => setLoading(false));
  }, [savedIds, idsLoading]);

  // Filter to only currently saved (optimistic removals)
  const displayed = assets.filter((a) => savedIds.has(a.id));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
            <Bookmark className="h-5 w-5 text-electric-blue dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100">Activos Guardados</h1>
            <p className="text-sm text-slate-gray dark:text-gray-400 mt-0.5">
              {loading ? "Cargando..." : `${displayed.length} activo${displayed.length !== 1 ? "s" : ""} guardado${displayed.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-5 h-72 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-8 w-8" />}
          title="No tenés activos guardados"
          description="Guardá activos del marketplace para encontrarlos rápidamente después."
          action={{ label: "Explorar el marketplace", href: "/dashboard/explore" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
