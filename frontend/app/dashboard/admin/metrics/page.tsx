"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ArrowUpRight, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/http";

const DATE_PRESETS = ["7 días", "30 días", "3 meses", "Año"];
const RANGE_MAP: Record<string, string> = { "7 días": "7d", "30 días": "30d", "3 meses": "90d", "Año": "365d" };
const CATEGORY_COLORS = ["#2563EB", "#4F46E5", "#059669", "#D97706", "#DC2626"];
const CATEGORY_LABELS: Record<string, string> = {
  software: "Software", design: "Diseño", business_model: "Negocio", content: "Contenido", other: "Otro",
};

interface MetricSnapshot {
  date: string;
  totalUsers: number;
  publishedAssets: number;
  totalRequests: number;
  closedRequests: number;
}

interface MetricsSummary {
  totalUsers: number;
  userGrowth: string;
  totalAssets: number;
  publishedAssets: number;
  totalRequests: number;
  conversionRate: string;
}

interface CategoryCount { name: string; value: number; color: string }
interface TopAsset { id: string; title: string; requestCount: number }

export default function AdminMetricsPage() {
  const [datePreset, setDatePreset] = useState("30 días");
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [topAssets, setTopAssets] = useState<TopAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const range = RANGE_MAP[datePreset];
      const [metricsRes, allAssetsRes, topAssetsRes] = await Promise.allSettled([
        apiFetch<{ snapshots: MetricSnapshot[]; summary: MetricsSummary | null }>(`/admin/metrics?range=${range}`),
        apiFetch<{ data: { category: string }[] }>("/assets?limit=200", { auth: false }),
        apiFetch<{ data: TopAsset[] }>("/assets?limit=5&status=published&sortBy=requestCount&sortOrder=desc", { auth: false }),
      ]);

      if (metricsRes.status === "fulfilled") {
        const { snapshots: snaps, summary: sum } = metricsRes.value;
        setSnapshots(snaps ?? []);
        setSummary(sum ?? null);
      }

      if (allAssetsRes.status === "fulfilled") {
        const res = allAssetsRes.value as { data: { category: string }[] };
        const counts: Record<string, number> = {};
        (res.data ?? []).forEach((a) => { counts[a.category] = (counts[a.category] ?? 0) + 1; });
        setCategories(
          Object.entries(counts).map(([cat, count], i) => ({
            name: CATEGORY_LABELS[cat] ?? cat,
            value: count,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }))
        );
      }

      if (topAssetsRes.status === "fulfilled") {
        const res = topAssetsRes.value as { data: TopAsset[] };
        setTopAssets(res.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [datePreset]);

  async function recordSnapshot() {
    setSnapshotLoading(true);
    setSnapshotMsg("");
    try {
      const [usersRes, assetsRes, publishedRes, requestsRes] = await Promise.all([
        apiFetch<{ total: number }>("/users?limit=1"),
        apiFetch<{ total: number }>("/assets?limit=1", { auth: false }),
        apiFetch<{ total: number }>("/assets?status=published&limit=1", { auth: false }),
        apiFetch<{ total: number }>("/requests?limit=1"),
      ]);
      await apiFetch("/admin/metrics/snapshot", {
        method: "POST",
        body: JSON.stringify({
          totalUsers: (usersRes as { total: number }).total ?? 0,
          newUsers: 0,
          totalAssets: (assetsRes as { total: number }).total ?? 0,
          publishedAssets: (publishedRes as { total: number }).total ?? 0,
          totalRequests: (requestsRes as { total: number }).total ?? 0,
          closedRequests: 0,
          totalViews: 0,
        }),
      });
      setSnapshotMsg("Snapshot registrado correctamente.");
      fetchData();
    } catch {
      setSnapshotMsg("No se pudo registrar el snapshot.");
    } finally {
      setSnapshotLoading(false);
    }
  }

  const hasSnapshotData = snapshots.length > 0;
  const chartData = snapshots.map((s) => ({
    date: new Date(s.date).toLocaleDateString("es", { day: "numeric", month: "short" }),
    users: s.totalUsers,
    assets: s.publishedAssets,
  }));

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between pb-8 border-b border-fog-gray">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray">Métricas y Reportes</h1>
          <p className="text-base text-slate-gray mt-1">Dashboard analítico de la plataforma</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex border border-fog-gray rounded-xl overflow-hidden bg-white">
            {DATE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  datePreset === p ? "bg-electric-blue text-white" : "text-slate-gray hover:bg-snow-gray"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            icon={<RefreshCw className={`h-4 w-4 ${snapshotLoading ? "animate-spin" : ""}`} />}
            variant="secondary"
            onClick={recordSnapshot}
            disabled={snapshotLoading}
          >
            Registrar Snapshot
          </Button>
        </div>
      </div>

      {snapshotMsg && (
        <div className={`mt-4 px-4 py-3 rounded-xl text-sm ${snapshotMsg.includes("correctamente") ? "bg-emerald-50 text-deep-emerald border border-emerald-200" : "bg-red-50 text-soft-coral border border-red-200"}`}>
          {snapshotMsg}
        </div>
      )}

      {/* Summary from API */}
      {summary && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { label: "Total Usuarios", value: String(summary.totalUsers), sub: "registrados en plataforma", trend: `+${summary.userGrowth}%`, positive: true },
            { label: "Activos Publicados", value: String(summary.publishedAssets), sub: `de ${summary.totalAssets} totales`, trend: "publicados", positive: true },
            { label: "Tasa de Conversión", value: `${summary.conversionRate}%`, sub: "solicitudes → cerradas", trend: "este período", positive: Number(summary.conversionRate) > 0 },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-fog-gray rounded-xl p-5">
              <p className="text-xs text-slate-gray font-medium">{kpi.label}</p>
              <p className="text-3xl font-bold text-carbon-gray mt-1">{kpi.value}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-gray">{kpi.sub}</p>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.positive ? "text-deep-emerald" : "text-soft-coral"}`}>
                  <ArrowUpRight className="h-3 w-3" />
                  {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Growth Chart */}
      <div className="mt-8 bg-white border border-fog-gray rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-carbon-gray">Crecimiento de Usuarios y Activos</h3>
            <p className="text-sm text-slate-gray mt-0.5">
              {hasSnapshotData ? "Evolución acumulada en el período" : "Sin snapshots para este período"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-electric-blue" />
              <span className="text-slate-gray">Usuarios</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-deep-emerald" />
              <span className="text-slate-gray">Activos</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-gray animate-pulse">Cargando datos...</div>
        ) : !hasSnapshotData ? (
          <div className="h-72 flex flex-col items-center justify-center text-center gap-4 bg-snow-gray rounded-xl">
            <TrendingUp className="h-10 w-10 text-slate-gray/40" />
            <p className="text-slate-gray text-sm">No hay snapshots registrados para este período.</p>
            <p className="text-xs text-slate-gray max-w-xs">Hacé clic en "Registrar Snapshot" para guardar el estado actual de la plataforma.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: "1px solid #E5E7EB", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Line type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="assets" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white border border-fog-gray rounded-xl p-6">
          <h3 className="text-lg font-semibold text-carbon-gray mb-6">Distribución por Categorías</h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-gray animate-pulse">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-gray">Sin datos</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-carbon-gray">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-carbon-gray">{cat.value}</span>
                      <span className="text-xs text-slate-gray ml-1">activos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Assets by Requests */}
        <div className="bg-white border border-fog-gray rounded-xl p-6">
          <h3 className="text-lg font-semibold text-carbon-gray mb-6">Top Activos por Solicitudes</h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-gray animate-pulse">Cargando...</div>
          ) : topAssets.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-gray">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={topAssets.map((a) => ({
                  name: a.title.length > 20 ? a.title.slice(0, 20) + "…" : a.title,
                  solicitudes: a.requestCount,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="solicitudes" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
