"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { AssetStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { cn, formatRelativeTime, ASSET_TYPE_LABELS } from "@/lib/utils";
import { apiFetch } from "@/lib/http";
import type { AssetCategory } from "@/types";

interface RawAsset {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  status: string;
  viewCount: number;
  requestCount: number;
  createdAt: string;
  tags: { id: string; tag: string }[];
}

interface PaginatedResponse {
  data: RawAsset[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = ["Todos", "Publicados", "Borradores", "Archivados"];

function statusLabel(filter: string): string | undefined {
  const map: Record<string, string> = {
    Publicados: "published",
    Borradores: "draft",
    Archivados: "archived",
  };
  return map[filter];
}

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<RawAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [reviewAsset, setReviewAsset] = useState<RawAsset | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const CHECKLIST_ITEMS = [
    "Contenido apropiado",
    "Información completa",
    "Sin contenido ofensivo",
    "Licencia claramente definida",
    "Sin spam o duplicados",
  ];

  async function fetchAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100", sortBy: "createdAt", sortOrder: "desc" });
      if (search) params.set("search", search);
      const st = statusLabel(statusFilter);
      if (st) params.set("status", st);

      const res = await apiFetch<PaginatedResponse>(`/assets?${params.toString()}`, { auth: false });
      setAssets(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAssets(); }, [search, statusFilter]);

  const hasFilters = !!search || statusFilter !== "Todos";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("Todos");
  };

  async function handlePublish(asset: RawAsset) {
    setActionLoading(true);
    try {
      await apiFetch(`/assets/${asset.id}/publish`, { method: "PATCH" });
      setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, status: "published" } : a));
      setReviewAsset(null);
    } catch {
      alert("No se pudo publicar el activo.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive(asset: RawAsset) {
    setActionLoading(true);
    try {
      await apiFetch(`/assets/${asset.id}/archive`, { method: "PATCH" });
      setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, status: "archived" } : a));
      setReviewAsset(null);
    } catch {
      alert("No se pudo archivar el activo.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Moderación de Activos</h1>
        <p className="text-base text-slate-gray mt-1">
          {loading ? "Cargando..." : `${total} activos en la plataforma`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mt-6 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border transition-colors",
                statusFilter === s ? "bg-electric-blue text-white border-electric-blue" : "bg-white text-slate-gray border-fog-gray hover:border-blue-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-snow-gray border-b border-fog-gray">
            <tr>
              {["Título / Titular", "Tipo", "Estado", "Vistas", "Solicitudes", "Publicado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wide text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-gray">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-electric-blue" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cargando activos...
                  </div>
                </td>
              </tr>
            ) : assets.map((asset) => (
              <tr key={asset.id} className="border-b border-fog-gray last:border-0 hover:bg-snow-gray transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-carbon-gray">{asset.title}</p>
                  <p className="text-xs text-slate-gray font-mono mt-0.5">{asset.ownerId.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-gray">
                  {ASSET_TYPE_LABELS[asset.category as AssetCategory] ?? asset.category}
                </td>
                <td className="px-4 py-3">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-gray">{asset.viewCount}</td>
                <td className="px-4 py-3 text-sm text-slate-gray">{asset.requestCount}</td>
                <td className="px-4 py-3 text-xs text-slate-gray">{formatRelativeTime(asset.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setReviewAsset(asset); setChecklist([]); setRejectReason(""); }}
                      className="p-1.5 text-slate-gray hover:text-electric-blue rounded-lg hover:bg-snow-gray transition-colors"
                      title="Revisar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {asset.status !== "published" && (
                      <button
                        onClick={() => handlePublish(asset)}
                        className="p-1.5 text-slate-gray hover:text-deep-emerald rounded-lg hover:bg-snow-gray transition-colors"
                        title="Publicar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {asset.status !== "archived" && (
                      <button
                        onClick={() => handleArchive(asset)}
                        className="p-1.5 text-slate-gray hover:text-soft-coral rounded-lg hover:bg-snow-gray transition-colors"
                        title="Archivar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && assets.length === 0 && (
          // Sin búsqueda ni filtro de estado no es "no encontramos": no hay nada cargado.
          hasFilters ? (
            <EmptyState
              size="sm"
              title="No se encontraron activos"
              description="Ningún activo coincide con la búsqueda o el filtro de estado."
              action={{ label: "Limpiar filtros", onClick: clearFilters, variant: "link" }}
            />
          ) : (
            <EmptyState
              size="sm"
              title="Todavía no hay activos publicados"
              description="Cuando los titulares empiecen a publicar, van a aparecer acá para moderar."
            />
          )
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewAsset}
        onClose={() => setReviewAsset(null)}
        title="Revisión de Activo"
        description={reviewAsset?.title}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewAsset(null)}>Cancelar</Button>
            {reviewAsset?.status !== "archived" && (
              <Button
                variant="destructive"
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => reviewAsset && handleArchive(reviewAsset)}
                disabled={actionLoading}
              >
                Archivar
              </Button>
            )}
            {reviewAsset?.status !== "published" && (
              <Button
                variant="success"
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() => reviewAsset && handlePublish(reviewAsset)}
                disabled={actionLoading}
              >
                Publicar
              </Button>
            )}
          </>
        }
      >
        {reviewAsset && (
          <div className="space-y-6">
            <div className="space-y-2 text-sm text-slate-gray">
              <p><span className="font-medium text-carbon-gray">ID Activo:</span> <span className="font-mono">{reviewAsset.id}</span></p>
              <p><span className="font-medium text-carbon-gray">ID Titular:</span> <span className="font-mono">{reviewAsset.ownerId}</span></p>
              <p><span className="font-medium text-carbon-gray">Tipo:</span> {ASSET_TYPE_LABELS[reviewAsset.category as AssetCategory] ?? reviewAsset.category}</p>
              <p><span className="font-medium text-carbon-gray">Estado actual:</span> {reviewAsset.status}</p>
              <p><span className="font-medium text-carbon-gray">Vistas / Solicitudes:</span> {reviewAsset.viewCount} / {reviewAsset.requestCount}</p>
            </div>

            {/* Checklist */}
            <div>
              <p className="text-sm font-semibold text-carbon-gray mb-3">Checklist de Revisión</p>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.includes(item)}
                      onChange={(e) => {
                        setChecklist((prev) =>
                          e.target.checked ? [...prev, item] : prev.filter((i) => i !== item)
                        );
                      }}
                      className="w-4 h-4 rounded border-fog-gray text-electric-blue"
                    />
                    <span className="text-sm text-carbon-gray">{item}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-fog-gray rounded-full">
                    <div
                      className="h-1.5 bg-electric-blue rounded-full transition-all"
                      style={{ width: `${(checklist.length / CHECKLIST_ITEMS.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-gray">{checklist.length}/{CHECKLIST_ITEMS.length}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">
                Notas del moderador
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Agregá observaciones o motivo de rechazo..."
                rows={3}
                className="w-full px-4 py-3 border border-fog-gray rounded-xl text-sm focus:outline-none focus:border-electric-blue resize-none transition-colors"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
