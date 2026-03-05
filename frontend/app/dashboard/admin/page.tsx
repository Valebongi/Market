import { Users, Package, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { AssetStatusBadge, RoleBadge } from "@/components/ui/Badge";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel de Administración" };

const MODERATION_ITEMS = [
  { id: "m1", type: "Activo reportado", asset: "Sistema IA para análisis de contratos", reason: "Contenido potencialmente engañoso", priority: "high", time: "hace 15 min" },
  { id: "m2", type: "Nuevo activo pendiente", asset: "Framework de marketing viral", reason: "Revisión inicial requerida", priority: "medium", time: "hace 1 hora" },
  { id: "m3", type: "Usuario sospechoso", asset: "—", reason: "Múltiples solicitudes inusuales", priority: "high", time: "hace 2 horas" },
];

const LIVE_ACTIVITY = [
  { emoji: "👤", event: "Nuevo usuario registrado", user: "carlos.dev@gmail.com", time: "hace 3 min" },
  { emoji: "📦", event: "Activo publicado", user: "Diseño UI Dashboard SaaS", time: "hace 7 min" },
  { emoji: "📬", event: "Solicitud enviada", user: "juan@startup.co → María García", time: "hace 12 min" },
  { emoji: "🤝", event: "Acuerdo reportado", user: "Template E-commerce cerrado", time: "hace 25 min" },
  { emoji: "👤", event: "Nuevo usuario registrado", user: "ana.ux@company.com", time: "hace 31 min" },
];

const TOP_ASSETS = [
  { title: "Sistema de Diseño B2B", views: 342, requests: 18 },
  { title: "App Gestión Inventario", views: 289, requests: 14 },
  { title: "Framework Ventas B2B", views: 234, requests: 12 },
  { title: "Marca Visual Fintech", views: 198, requests: 9 },
  { title: "Componentes UI React", views: 176, requests: 7 },
];

const TOP_OWNERS = [
  { name: "María García", assets: 12, agreements: 8 },
  { name: "Juan Rodríguez", assets: 9, agreements: 6 },
  { name: "Ana López", assets: 7, agreements: 5 },
  { name: "Carlos Martínez", assets: 5, agreements: 4 },
  { name: "Laura Sánchez", assets: 4, agreements: 3 },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="bg-midnight-blue rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <div className="flex items-center gap-6 mt-4 text-sm text-white/70">
              <span>350 usuarios totales</span>
              <span>·</span>
              <span>120 activos publicados</span>
              <span>·</span>
              <span>34 solicitudes activas</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
          <Link href="/dashboard/admin/metrics">
            <button className="bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
              Generar Reporte
            </button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Users className="h-5 w-5" />} value="37" label="Nuevos usuarios (7 días)" trend={{ value: "+22%", positive: true }} iconColor="text-electric-blue" />
        <StatCard icon={<Package className="h-5 w-5" />} value="18" label="Activos publicados (30 días)" trend={{ value: "+15%", positive: true }} iconColor="text-soft-indigo" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} value="12.3%" label="Tasa de conversión" iconColor="text-deep-emerald" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} value="89" label="Mensajes intercambiados" trend={{ value: "+8%", positive: true }} iconColor="text-warm-amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Moderación Urgente */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-carbon-gray">Requiere Moderación</h2>
            <Link href="/dashboard/admin/assets" className="text-sm text-electric-blue hover:underline">
              Ver todos
            </Link>
          </div>

          {MODERATION_ITEMS.map((item) => (
            <div
              key={item.id}
              className="bg-amber-50 border-l-4 border-warm-amber rounded-r-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warm-amber shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-carbon-gray">{item.type}</p>
                  {item.asset !== "—" && (
                    <p className="text-sm text-slate-gray mt-0.5">{item.asset}</p>
                  )}
                  <p className="text-xs text-slate-gray mt-1">{item.reason}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-slate-gray" />
                    <span className="text-xs text-slate-gray">{item.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="text-xs px-3 py-1.5 bg-deep-emerald text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Revisar
                </button>
              </div>
            </div>
          ))}

          {/* Actividad en Vivo */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-carbon-gray mb-4">Actividad Reciente</h2>
            <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
              {LIVE_ACTIVITY.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i !== LIVE_ACTIVITY.length - 1 ? "border-b border-fog-gray" : ""}`}>
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-carbon-gray">{item.event}</p>
                    <p className="text-xs text-slate-gray truncate">{item.user}</p>
                  </div>
                  <span className="text-xs text-slate-gray shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-carbon-gray mb-4">Top Activos</h2>
            <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
              {TOP_ASSETS.map((asset, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm ${i !== TOP_ASSETS.length - 1 ? "border-b border-fog-gray" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-gray w-4 text-center">{i + 1}</span>
                    <p className="text-carbon-gray font-medium truncate">{asset.title}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-gray shrink-0 ml-2">
                    <span>{asset.views}v</span>
                    <span>{asset.requests}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-carbon-gray mb-4">Top Titulares</h2>
            <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
              {TOP_OWNERS.map((owner, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i !== TOP_OWNERS.length - 1 ? "border-b border-fog-gray" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-gray w-4">{i + 1}</span>
                    <div className="w-7 h-7 bg-blue-50 text-electric-blue rounded-full flex items-center justify-center text-xs font-bold">
                      {owner.name[0]}
                    </div>
                    <p className="text-sm font-medium text-carbon-gray">{owner.name}</p>
                  </div>
                  <div className="text-xs text-slate-gray">
                    {owner.assets} activos · {owner.agreements} acuerdos
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
