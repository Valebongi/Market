"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { AssetStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { cn, formatRelativeTime, ASSET_TYPE_LABELS } from "@/lib/utils";
import type { AssetType } from "@/types";

interface ModerationAsset {
  id: string;
  title: string;
  owner: string;
  assetType: AssetType;
  status: string;
  reports: number;
  createdAt: string;
}

const MOCK_ASSETS: ModerationAsset[] = [
  { id: "1", title: "Sistema IA para análisis de contratos", owner: "Tech Corp SA", assetType: "software", status: "flagged", reports: 3, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: "2", title: "Framework de marketing viral", owner: "GrowthHacker", assetType: "business_model", status: "published", reports: 0, createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
  { id: "3", title: "Kit UI Dashboard Premium", owner: "DesignPro", assetType: "design", status: "published", reports: 0, createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  { id: "4", title: "Modelo de negocio dudoso", owner: "Anónimo", assetType: "business_model", status: "flagged", reports: 5, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { id: "5", title: "API de pagos integrada", owner: "FinDev Labs", assetType: "software", status: "published", reports: 0, createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
];

const STATUS_OPTIONS = ["Todos", "Publicados", "Flagged", "Archivados"];

export default function AdminAssetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [reviewAsset, setReviewAsset] = useState<ModerationAsset | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);

  const CHECKLIST_ITEMS = [
    "Contenido apropiado",
    "Información completa",
    "Sin contenido ofensivo",
    "Licencia claramente definida",
    "Sin spam o duplicados",
  ];

  const filtered = MOCK_ASSETS.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || (statusFilter === "Publicados" && a.status === "published") || (statusFilter === "Flagged" && a.status === "flagged");
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Moderación de Activos</h1>
        <p className="text-base text-slate-gray mt-1">Revisá y moderá los activos publicados</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mt-6 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Buscar por título o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue transition-colors"
          />
        </div>
        <div className="flex gap-2">
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
              {["Título", "Titular", "Tipo", "Estado", "Reportes", "Publicado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wide text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset) => (
              <tr key={asset.id} className="border-b border-fog-gray last:border-0 hover:bg-snow-gray transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-carbon-gray">{asset.title}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-gray">{asset.owner}</td>
                <td className="px-4 py-3 text-sm text-slate-gray">{ASSET_TYPE_LABELS[asset.assetType]}</td>
                <td className="px-4 py-3">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="px-4 py-3">
                  {asset.reports > 0 ? (
                    <span className="flex items-center gap-1 text-sm text-warm-amber font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {asset.reports}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-gray">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-gray">{formatRelativeTime(asset.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setReviewAsset(asset)}
                      className="p-1.5 text-slate-gray hover:text-electric-blue rounded-lg hover:bg-snow-gray transition-colors"
                      title="Revisar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-gray hover:text-deep-emerald rounded-lg hover:bg-snow-gray transition-colors" title="Aprobar">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-gray hover:text-soft-coral rounded-lg hover:bg-snow-gray transition-colors" title="Rechazar">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-gray text-sm">No se encontraron activos</div>
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
            <Button variant="ghost" icon={<AlertTriangle className="h-4 w-4" />}>Solicitar Cambios</Button>
            <Button variant="destructive" icon={<XCircle className="h-4 w-4" />}>Rechazar</Button>
            <Button variant="success" icon={<CheckCircle className="h-4 w-4" />}>Aprobar</Button>
          </>
        }
      >
        <div className="space-y-6">
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
      </Modal>
    </div>
  );
}
