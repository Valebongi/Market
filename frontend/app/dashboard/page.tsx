"use client";

import { useEffect, useState } from "react";
import { Package, MessageSquare, Eye, TrendingUp, Plus, Search, Globe, Clock } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { assetsService as assetsApi } from "@/services/assets.service";
import { requestsService as requestsApi } from "@/services/requests.service";
import { formatRelativeTime } from "@/lib/utils";

interface ActivityItem {
  id: string;
  status: string;
  message: string;
  time: string;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-carbon-gray dark:text-gray-100 flex items-center gap-2.5">
      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-electric-blue to-violet-500 inline-block shrink-0" />
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assetsPublished: 0,
    requestsReceived: 0,
    activeLicenses: 0,
    totalViews: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.allSettled([
      // Activos publicados del titular. Va por la ruta de gestión igual que
      // /dashboard/assets: el scope sale del token, no de un `ownerId` que
      // viaja en la querystring de una ruta pública.
      assetsApi.manageList({ status: "published", limit: 100 }),
      requestsApi.list("owner"),
    ])
      .then(([assetsResult, requestsResult]) => {
        const assetsRes = assetsResult.status === "fulfilled" ? assetsResult.value : null;
        const requestsRes = requestsResult.status === "fulfilled" ? requestsResult.value : null;

        const assets = assetsRes?.data || [];
        const requests = requestsRes?.data || [];

        const totalViews = assets.reduce((sum, a) => sum + (a.viewCount || 0), 0);
        const activeLicenses = requests.filter((r) => r.status === "accepted").length;
        const pending = requests.filter((r) => r.status === "pending").length;

        setStats({
          assetsPublished: assetsRes?.total ?? assets.length,
          requestsReceived: requestsRes?.total ?? requests.length,
          activeLicenses,
          totalViews,
        });
        setPendingCount(pending);

        const activity: ActivityItem[] = requests.slice(0, 5).map((r) => ({
          id: r.id,
          status: r.status,
          message: `${r.status === "pending" ? "Nueva solicitud" : r.status === "accepted" ? "Solicitud aceptada" : "Solicitud"} para ${r.assetTitle || "un activo"}`,
          time: formatRelativeTime(r.updatedAt || r.createdAt),
        }));
        setRecentActivity(activity);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.profile?.displayName || user?.email?.split("@")[0] || "usuario";
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatStat = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const activityStyles: Record<string, { bg: string; icon: string }> = {
    pending:  { bg: "bg-amber-50",   icon: "📬" },
    accepted: { bg: "bg-emerald-50", icon: "✅" },
    rejected: { bg: "bg-red-50",     icon: "✖" },
    closed:   { bg: "bg-fog-gray",   icon: "💬" },
  };

  return (
    <div className="min-h-full market-grid-bg">
    <div className="p-4 sm:p-8 max-w-wide mx-auto animate-fade-in">
      {/* Header — matches landing hero style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-electric-blue via-blue-600 to-violet-600 p-5 sm:p-7 mb-6 sm:mb-8 shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-10" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1 mb-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[11px] font-semibold text-white/90 tracking-wide">Panel activo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display leading-tight">
              Hola, {displayName.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-white/70 mt-1">Bienvenido/a a tu panel de control</p>
          </div>
          <p className="text-xs text-white/60 capitalize hidden sm:block shrink-0 mt-1">{today}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="mt-6 sm:mt-8 bg-white dark:bg-gray-900/60 rounded-2xl p-4 sm:p-6 border border-blue-100 dark:border-white/10 shadow-sm">
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 sm:h-28 bg-fog-gray rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
            <StatCard
              icon={<Package className="h-5 w-5" />}
              value={formatStat(stats.assetsPublished)}
              label="Activos Publicados"
              iconColor="text-electric-blue"
              iconBg="bg-blue-50"
              accentBorder="border-t-electric-blue"
            />
            <StatCard
              icon={<MessageSquare className="h-5 w-5" />}
              value={formatStat(stats.requestsReceived)}
              label="Solicitudes Recibidas"
              trend={pendingCount > 0 ? { value: `${pendingCount} pendientes`, positive: false } : undefined}
              iconColor="text-soft-indigo"
              iconBg="bg-indigo-50"
              accentBorder="border-t-soft-indigo"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              value={formatStat(stats.activeLicenses)}
              label="Licencias Activas"
              iconColor="text-deep-emerald"
              iconBg="bg-emerald-50"
              accentBorder="border-t-deep-emerald"
            />
            <StatCard
              icon={<Eye className="h-5 w-5" />}
              value={formatStat(stats.totalViews)}
              label="Vistas Totales"
              iconColor="text-warm-amber"
              iconBg="bg-amber-50"
              accentBorder="border-t-warm-amber"
            />
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <SectionHeading>Acciones Rápidas</SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link href="/dashboard/assets/new">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800/50 rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 hover:border-electric-blue hover:shadow-[0_4px_20px_rgba(37,99,235,0.15)] transition-all group cursor-pointer">
              <div className="w-11 h-11 bg-electric-blue rounded-xl flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-midnight-blue dark:text-gray-100">Publicar Nuevo Activo</p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">Comenzá a monetizar tu próxima creación</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/requests">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 hover:border-soft-indigo hover:shadow-[0_4px_20px_rgba(79,70,229,0.15)] transition-all group cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-soft-indigo rounded-xl flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-midnight-blue dark:text-gray-100">Revisar Solicitudes</p>
                  {pendingCount > 0 && (
                    <span className="bg-electric-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
                  )}
                </div>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""} de revisión` : "Revisá el estado de tus conversaciones"}
                </p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/explore">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 hover:border-deep-emerald hover:shadow-[0_4px_20px_rgba(5,150,105,0.15)] transition-all group cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-deep-emerald rounded-xl flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-midnight-blue dark:text-gray-100">Explorar Marketplace</p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">Descubrí activos disponibles en la plataforma</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/domains">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 hover:border-warm-amber hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)] transition-all group cursor-pointer">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-warm-amber rounded-xl flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-midnight-blue dark:text-gray-100">Buscar Dominio</p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">Encontrá el dominio perfecto para tu proyecto</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Actividad Reciente */}
      <section className="mt-6 sm:mt-8 pb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <SectionHeading>Actividad Reciente</SectionHeading>
          <Link href="/dashboard/requests" className="text-sm text-electric-blue hover:underline">
            Ver todo el historial
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-fog-gray rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyState
            size="sm"
            title="No hay actividad reciente aún"
            description="Publicá un activo para comenzar."
            className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl"
          />
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl overflow-hidden">
            {recentActivity.map((item, index) => {
              const style = activityStyles[item.status] ?? activityStyles.closed;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors ${
                    index !== recentActivity.length - 1 ? "border-b border-fog-gray dark:border-white/10" : ""
                  }`}
                >
                  <div className={`w-9 h-9 ${style.bg} rounded-full flex items-center justify-center text-sm shrink-0`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-carbon-gray dark:text-gray-200">{item.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-gray dark:text-gray-500 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    {item.time}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
