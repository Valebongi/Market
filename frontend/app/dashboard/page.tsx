"use client";

import { useEffect, useState } from "react";
import { Package, MessageSquare, Eye, TrendingUp, Plus, Search, Globe, Clock } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";
import { assetsApi, requestsApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

interface ActivityItem {
  id: string;
  status: string;
  message: string;
  time: string;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 flex items-center gap-2.5">
      <span className="w-0.5 h-5 bg-electric-blue rounded-full inline-block shrink-0" />
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
      assetsApi.list({ ownerId: user.id, status: "published", limit: 100 }),
      requestsApi.list("owner"),
    ])
      .then(([assetsResult, requestsResult]) => {
        const assetsRes = assetsResult.status === "fulfilled" ? assetsResult.value : null;
        const requestsRes = requestsResult.status === "fulfilled" ? requestsResult.value : null;

        const assets = assetsRes?.data || [];
        const requests = requestsRes?.data || [];

        const totalViews = assets.reduce((sum: number, a: any) => sum + (a.viewCount || 0), 0);
        const activeLicenses = requests.filter((r: any) => r.status === "accepted").length;
        const pending = requests.filter((r: any) => r.status === "pending").length;

        setStats({
          assetsPublished: assetsRes?.total ?? assets.length,
          requestsReceived: requestsRes?.total ?? requests.length,
          activeLicenses,
          totalViews,
        });
        setPendingCount(pending);

        const activity: ActivityItem[] = requests.slice(0, 5).map((r: any) => ({
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
    <div className="p-8 max-w-wide mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between pb-8 border-b border-fog-gray dark:border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray dark:text-gray-100 font-display">
            Hola, {displayName.split(" ")[0]} 👋
          </h1>
          <p className="text-base text-slate-gray dark:text-gray-400 mt-1">Bienvenido/a a tu dashboard</p>
        </div>
        <p className="text-sm text-slate-gray dark:text-gray-500 capitalize hidden sm:block">{today}</p>
      </div>

      {/* Stats Grid */}
      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-fog-gray rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <SectionHeading>Acciones Rápidas</SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/assets/new">
            <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 flex items-start gap-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-subtle transition-all group cursor-pointer">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-electric-blue group-hover:bg-electric-blue group-hover:text-white transition-all shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-carbon-gray dark:text-gray-100 group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
                  Publicar Nuevo Activo
                </p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  Comenzá a monetizar tu próxima creación
                </p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/requests">
            <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 flex items-start gap-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-subtle transition-all group cursor-pointer">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center text-soft-indigo group-hover:bg-soft-indigo group-hover:text-white transition-all shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-carbon-gray dark:text-gray-100 group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
                    Revisar Solicitudes
                  </p>
                  {pendingCount > 0 && (
                    <span className="bg-electric-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  {pendingCount > 0
                    ? `Tenés ${pendingCount} solicitud${pendingCount > 1 ? "es" : ""} pendiente${pendingCount > 1 ? "s" : ""} de revisión`
                    : "Revisá el estado de tus conversaciones"}
                </p>
              </div>
            </div>
          </Link>

          <Link href="/assets">
            <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 flex items-start gap-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-subtle transition-all group cursor-pointer">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-deep-emerald group-hover:bg-deep-emerald group-hover:text-white transition-all shrink-0">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-carbon-gray dark:text-gray-100 group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
                  Explorar Marketplace
                </p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  Descubrí activos disponibles en la plataforma
                </p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/domains">
            <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 flex items-start gap-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-subtle transition-all group cursor-pointer">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center text-warm-amber group-hover:bg-warm-amber group-hover:text-white transition-all shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-carbon-gray dark:text-gray-100 group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
                  Buscar Dominio
                </p>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  Encontrá el dominio perfecto para tu proyecto
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Actividad Reciente */}
      <section className="mt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
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
          <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-8 text-center">
            <p className="text-slate-gray dark:text-gray-400 text-sm">No hay actividad reciente aún.</p>
            <p className="text-slate-gray dark:text-gray-500 text-xs mt-1">Publicá un activo para comenzar.</p>
          </div>
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
  );
}
