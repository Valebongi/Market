"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, LayoutGrid, List, Eye, MessageSquare, MoreHorizontal, Pencil, Archive, Trash2, Package } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { AssetStatusBadge } from "@/components/ui/Badge";
import { cn, formatRelativeTime, ASSET_TYPE_LABELS, LICENSE_TYPE_LABELS, formatNumber } from "@/lib/utils";
import type { Asset, AssetCategory, LicenseType } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";

const TABS = ["Publicados", "Borradores", "Archivados"] as const;
type Tab = (typeof TABS)[number];

const STATUS_MAP: Record<Tab, string[]> = {
  Publicados: ["published", "flagged"],
  Borradores: ["draft"],
  Archivados: ["archived"],
};

function AssetGridCard({ asset, onArchive, onDelete, onPublish }: {
  asset: Asset;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actioning, setActioning] = useState(false);

  const handleArchive = async () => {
    setMenuOpen(false);
    setActioning(true);
    try {
      if (asset.status === "archived") {
        await assetsApi.publish(asset.id);
        onPublish(asset.id);
      } else {
        await assetsApi.archive(asset.id);
        onArchive(asset.id);
      }
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("¿Eliminar este activo? Esta acción no se puede deshacer.")) return;
    setActioning(true);
    try {
      await assetsApi.remove(asset.id);
      onDelete(asset.id);
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className={cn("bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-5 relative", actioning && "opacity-60 pointer-events-none")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <AssetStatusBadge status={asset.status} />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 border border-fog-gray dark:border-white/10 rounded-xl shadow-medium z-10 py-1">
              <Link href={`/dashboard/assets/${asset.id}/edit`}>
                <button className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left hover:bg-snow-gray dark:hover:bg-white/10 transition-colors text-carbon-gray dark:text-gray-200" onClick={() => setMenuOpen(false)}>
                  <Pencil className="h-4 w-4" />Editar
                </button>
              </Link>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left hover:bg-snow-gray dark:hover:bg-white/10 transition-colors text-carbon-gray dark:text-gray-200"
                onClick={handleArchive}
              >
                <Archive className="h-4 w-4" />
                {asset.status === "archived" ? "Publicar" : "Archivar"}
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left hover:bg-snow-gray dark:hover:bg-white/10 transition-colors text-soft-coral"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-carbon-gray dark:text-gray-100 line-clamp-2">{asset.title}</h3>
      <p className="text-sm text-slate-gray dark:text-gray-400 mt-1 line-clamp-2">{asset.description}</p>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-gray dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {formatNumber(asset.viewCount)}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {formatNumber(asset.requestCount)}
        </span>
        <span>{formatRelativeTime(asset.createdAt)}</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Link href={`/assets/${asset.id}`} className="flex-1">
          <Button variant="ghost" size="sm" fullWidth>Ver Detalle</Button>
        </Link>
        <Link href={`/dashboard/assets/${asset.id}/edit`} className="flex-1">
          <Button variant="secondary" size="sm" fullWidth>Editar</Button>
        </Link>
      </div>
    </div>
  );
}

function AssetTableRow({ asset, onArchive, onDelete, onPublish }: {
  asset: Asset;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const [actioning, setActioning] = useState(false);

  const handleArchive = async () => {
    setActioning(true);
    try {
      if (asset.status === "archived") {
        await assetsApi.publish(asset.id);
        onPublish(asset.id);
      } else {
        await assetsApi.archive(asset.id);
        onArchive(asset.id);
      }
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este activo? Esta acción no se puede deshacer.")) return;
    setActioning(true);
    try {
      await assetsApi.remove(asset.id);
      onDelete(asset.id);
    } finally {
      setActioning(false);
    }
  };

  return (
    <tr className={cn(
      "hover:bg-snow-gray dark:hover:bg-white/5 transition-colors border-b border-fog-gray dark:border-white/10 last:border-0",
      actioning && "opacity-60 pointer-events-none"
    )}>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-carbon-gray dark:text-gray-100">{asset.title}</p>
          <p className="text-xs text-slate-gray dark:text-gray-500">{ASSET_TYPE_LABELS[asset.assetType as AssetCategory] || asset.assetType}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-gray dark:text-gray-400">{LICENSE_TYPE_LABELS[asset.licenseType as LicenseType] || asset.licenseType}</td>
      <td className="px-4 py-3">
        <AssetStatusBadge status={asset.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-gray dark:text-gray-400 flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" /> {formatNumber(asset.viewCount)}
      </td>
      <td className="px-4 py-3 text-sm text-slate-gray dark:text-gray-400">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> {formatNumber(asset.requestCount)}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-gray dark:text-gray-500">{formatRelativeTime(asset.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href={`/assets/${asset.id}`}>
            <button className="p-1.5 text-slate-gray dark:text-gray-400 hover:text-electric-blue rounded-lg hover:bg-snow-gray dark:hover:bg-white/10 transition-colors">
              <Eye className="h-4 w-4" />
            </button>
          </Link>
          <Link href={`/dashboard/assets/${asset.id}/edit`}>
            <button className="p-1.5 text-slate-gray dark:text-gray-400 hover:text-electric-blue rounded-lg hover:bg-snow-gray dark:hover:bg-white/10 transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
          </Link>
          <button
            onClick={handleArchive}
            className="p-1.5 text-slate-gray dark:text-gray-400 hover:text-electric-blue rounded-lg hover:bg-snow-gray dark:hover:bg-white/10 transition-colors"
            title={asset.status === "archived" ? "Publicar" : "Archivar"}
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-gray dark:text-gray-400 hover:text-soft-coral rounded-lg hover:bg-snow-gray dark:hover:bg-white/10 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function MyAssetsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Publicados");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Activos del titular en todos los estados. Va por `manageList` (ruta
      // autenticada): la pública fuerza `status: 'published'` y devolvía
      // vacío para borradores y archivados.
      // Sin `ownerId`: el backend lo pisa con el `sub` del token.
      const [published, drafts, archived] = await Promise.all([
        assetsApi.manageList({ status: "published", limit: 100 }),
        assetsApi.manageList({ status: "draft", limit: 100 }),
        assetsApi.manageList({ status: "archived", limit: 100 }),
      ]);
      const all = [
        ...(published.data || []),
        ...(drafts.data || []),
        ...(archived.data || []),
      ].map((a) => mapAsset(a) as Asset);
      setAllAssets(all);
    } catch {
      setAllAssets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleArchive = (id: string) => {
    setAllAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "archived" as const } : a))
    );
  };
  const handlePublish = (id: string) => {
    setAllAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "published" as const } : a))
    );
  };
  const handleDelete = (id: string) => {
    setAllAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const filteredAssets = allAssets.filter((a) => {
    const matchesTab = STATUS_MAP[activeTab].includes(a.status);
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabCount = (tab: Tab) =>
    allAssets.filter((a) => STATUS_MAP[tab].includes(a.status)).length;

  return (
    <div className="p-4 sm:p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 sm:pb-8 border-b border-fog-gray dark:border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100">Mis Activos</h1>
          <p className="text-sm sm:text-base text-slate-gray dark:text-gray-400 mt-1">Gestioná tus publicaciones</p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button icon={<Plus className="h-4 w-4" />} size="sm">
            <span className="hidden sm:inline">Publicar Nuevo Activo</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-fog-gray dark:border-white/10 mt-4 sm:mt-6">
        {TABS.map((tab) => {
          const count = tabCount(tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-electric-blue text-electric-blue dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200"
              )}
            >
              {tab}
              {count > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold", activeTab === tab ? "bg-electric-blue text-white" : "bg-fog-gray dark:bg-white/10 text-slate-gray dark:text-gray-400")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Buscar activos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500 transition-colors"
          />
        </div>
        {/* Grid/list toggle: desktop only */}
        <div className="hidden sm:flex border border-fog-gray dark:border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-snow-gray dark:bg-white/10 text-carbon-gray dark:text-gray-200" : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 border-l border-fog-gray dark:border-white/10 transition-colors", viewMode === "list" ? "bg-snow-gray dark:bg-white/10 text-carbon-gray dark:text-gray-200" : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content — always grid on mobile, grid/list on desktop */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-fog-gray rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7 sm:h-8 sm:w-8" />}
          title={search ? "No encontramos activos" : "Aún no hay activos aquí"}
          description={
            search
              ? "Intentá con otro término de búsqueda."
              : "Publicá tu primer activo y comenzá a monetizar."
          }
          action={
            search
              ? undefined
              : { label: "Publicar mi Primer Activo", href: "/dashboard/assets/new" }
          }
        />
      ) : viewMode === "grid" || true ? (
        // Always grid on mobile; grid/list controlled on desktop
        <div className={cn(
          viewMode === "list" ? "hidden sm:block" : "",
          "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
        )}>
          {filteredAssets.map((asset) => (
            <AssetGridCard
              key={asset.id}
              asset={asset}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          ))}
        </div>
      ) : (
        <div className="hidden sm:block bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-snow-gray dark:bg-gray-800 border-b border-fog-gray dark:border-white/10">
              <tr>
                {["Nombre", "Licencia", "Estado", "Vistas", "Solicitudes", "Publicado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-gray dark:text-gray-400 uppercase tracking-wide text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <AssetTableRow
                  key={asset.id}
                  asset={asset}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
