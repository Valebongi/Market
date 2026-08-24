"use client";

import { useState, useEffect } from "react";
import { Users, Package, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import Link from "next/link";
import { apiFetch } from "@/lib/http";

interface Stats {
  totalUsers: number;
  totalAssets: number;
  publishedAssets: number;
  totalRequests: number;
}

interface TopAsset {
  id: string;
  title: string;
  viewCount: number;
  requestCount: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalAssets: 0, publishedAssets: 0, totalRequests: 0 });
  const [topAssets, setTopAssets] = useState<TopAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, allAssetsRes, publishedRes, requestsRes, topAssetsRes] = await Promise.allSettled([
          apiFetch<{ total: number }>("/users?limit=1"),
          apiFetch<{ total: number }>("/assets?limit=1", { auth: false }),
          apiFetch<{ total: number }>("/assets?status=published&limit=1", { auth: false }),
          apiFetch<{ total: number }>("/requests?limit=1"),
          apiFetch<{ data: TopAsset[] }>("/assets?limit=5&sortBy=viewCount&sortOrder=desc", { auth: false }),
        ]);

        setStats({
          totalUsers: usersRes.status === "fulfilled" ? (usersRes.value as { total: number }).total ?? 0 : 0,
          totalAssets: allAssetsRes.status === "fulfilled" ? (allAssetsRes.value as { total: number }).total ?? 0 : 0,
          publishedAssets: publishedRes.status === "fulfilled" ? (publishedRes.value as { total: number }).total ?? 0 : 0,
          totalRequests: requestsRes.status === "fulfilled" ? (requestsRes.value as { total: number }).total ?? 0 : 0,
        });

        if (topAssetsRes.status === "fulfilled") {
          const res = topAssetsRes.value as { data: TopAsset[] };
          setTopAssets(res.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="bg-midnight-blue rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <div className="flex items-center gap-6 mt-4 text-sm text-white/70">
              {loading ? (
                <span className="animate-pulse">Cargando estadísticas...</span>
              ) : (
                <>
                  <span>{stats.totalUsers} usuarios totales</span>
                  <span>·</span>
                  <span>{stats.publishedAssets} activos publicados</span>
                  <span>·</span>
                  <span>{stats.totalRequests} solicitudes</span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Online
                  </span>
                </>
              )}
            </div>
          </div>
          <Link href="/dashboard/admin/metrics">
            <button className="bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
              Ver Métricas
            </button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={loading ? "—" : String(stats.totalUsers)}
          label="Usuarios registrados"
          iconColor="text-electric-blue"
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          value={loading ? "—" : String(stats.publishedAssets)}
          label="Activos publicados"
          iconColor="text-soft-indigo"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={loading ? "—" : String(stats.totalAssets)}
          label="Activos totales"
          iconColor="text-deep-emerald"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          value={loading ? "—" : String(stats.totalRequests)}
          label="Solicitudes totales"
          iconColor="text-warm-amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Moderation + Quick Links */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-carbon-gray">Requiere Atención</h2>
            <Link href="/dashboard/admin/assets" className="text-sm text-electric-blue hover:underline">
              Ver todos los activos
            </Link>
          </div>

          <div className="bg-amber-50 border-l-4 border-warm-amber rounded-r-xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warm-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-carbon-gray">Activos pendientes de revisión</p>
                <p className="text-sm text-slate-gray mt-0.5">Revisá los activos en borrador o recién publicados</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-3 w-3 text-slate-gray" />
                  <span className="text-xs text-slate-gray">Moderación manual</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/admin/assets"
              className="text-xs px-3 py-1.5 bg-deep-emerald text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shrink-0"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Revisar
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-carbon-gray mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/admin/users" className="bg-white border border-fog-gray rounded-xl p-4 hover:border-electric-blue transition-colors group">
                <Users className="h-5 w-5 text-electric-blue mb-2" />
                <p className="text-sm font-semibold text-carbon-gray group-hover:text-electric-blue">Gestionar Usuarios</p>
                <p className="text-xs text-slate-gray mt-0.5">{loading ? "..." : `${stats.totalUsers} registrados`}</p>
              </Link>
              <Link href="/dashboard/admin/assets" className="bg-white border border-fog-gray rounded-xl p-4 hover:border-electric-blue transition-colors group">
                <Package className="h-5 w-5 text-soft-indigo mb-2" />
                <p className="text-sm font-semibold text-carbon-gray group-hover:text-electric-blue">Moderar Activos</p>
                <p className="text-xs text-slate-gray mt-0.5">{loading ? "..." : `${stats.totalAssets} en plataforma`}</p>
              </Link>
              <Link href="/dashboard/admin/metrics" className="bg-white border border-fog-gray rounded-xl p-4 hover:border-electric-blue transition-colors group">
                <TrendingUp className="h-5 w-5 text-deep-emerald mb-2" />
                <p className="text-sm font-semibold text-carbon-gray group-hover:text-electric-blue">Ver Métricas</p>
                <p className="text-xs text-slate-gray mt-0.5">Análisis detallado</p>
              </Link>
              <Link href="/dashboard/requests" className="bg-white border border-fog-gray rounded-xl p-4 hover:border-electric-blue transition-colors group">
                <MessageSquare className="h-5 w-5 text-warm-amber mb-2" />
                <p className="text-sm font-semibold text-carbon-gray group-hover:text-electric-blue">Ver Solicitudes</p>
                <p className="text-xs text-slate-gray mt-0.5">{loading ? "..." : `${stats.totalRequests} totales`}</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Top Assets */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-carbon-gray mb-4">Top Activos por Vistas</h2>
            <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
              {loading ? (
                <div className="py-6 text-center text-sm text-slate-gray animate-pulse">Cargando...</div>
              ) : topAssets.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-gray">Sin datos disponibles</div>
              ) : topAssets.map((asset, i) => (
                <div key={asset.id} className={`flex items-center justify-between px-4 py-3 text-sm ${i !== topAssets.length - 1 ? "border-b border-fog-gray" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-gray w-4 text-center">{i + 1}</span>
                    <p className="text-carbon-gray font-medium truncate">{asset.title}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-gray shrink-0 ml-2">
                    <span>{asset.viewCount}v</span>
                    <span>{asset.requestCount}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-carbon-gray mb-2">Registrar Snapshot de Métricas</h3>
            <p className="text-xs text-slate-gray mb-3">
              Guardá un snapshot de métricas actuales para el historial de crecimiento.
            </p>
            <Link
              href="/dashboard/admin/metrics"
              className="text-xs px-3 py-2 bg-electric-blue text-white rounded-lg hover:bg-midnight-blue transition-colors inline-flex items-center gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Ir a Métricas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
