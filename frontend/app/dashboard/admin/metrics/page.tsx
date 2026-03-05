"use client";

import { useState } from "react";
import { Download, TrendingUp, Users, Package, ArrowUpRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, FunnelChart, Funnel, LabelList } from "recharts";
import Button from "@/components/ui/Button";

const DATE_PRESETS = ["7 días", "30 días", "3 meses", "Año"];

// Mock data para gráficos
const GROWTH_DATA = [
  { date: "1 Feb", users: 280, assets: 95 },
  { date: "5 Feb", users: 295, assets: 100 },
  { date: "8 Feb", users: 310, assets: 104 },
  { date: "12 Feb", users: 325, assets: 108 },
  { date: "15 Feb", users: 335, assets: 113 },
  { date: "18 Feb", users: 350, assets: 120 },
];

const CATEGORY_DATA = [
  { name: "Software", value: 38, color: "#2563EB" },
  { name: "Diseño", value: 24, color: "#4F46E5" },
  { name: "Negocio", value: 31, color: "#059669" },
  { name: "Contenido", value: 27, color: "#D97706" },
];

const FUNNEL_DATA = [
  { name: "Visitas Marketplace", value: 2400, fill: "#2563EB" },
  { name: "Vistas de Activo", value: 890, fill: "#4F46E5" },
  { name: "Solicitudes Enviadas", value: 310, fill: "#059669" },
  { name: "Conversaciones", value: 180, fill: "#D97706" },
  { name: "Acuerdos Cerrados", value: 42, fill: "#DC2626" },
];

const TOP_ASSETS_DATA = [
  { name: "Sistema Diseño B2B", solicitudes: 18 },
  { name: "App Inventario", solicitudes: 14 },
  { name: "Framework Ventas", solicitudes: 12 },
  { name: "Marca Fintech", solicitudes: 9 },
  { name: "Componentes UI", solicitudes: 7 },
];

const KPIS = [
  { label: "Tasa de Conversión", value: "12.3%", sub: "solicitudes → acuerdos", trend: "+2.1%", positive: true },
  { label: "Usuarios Activos MAU", value: "234", sub: "Promedio 4.2 sesiones", trend: "+18%", positive: true },
  { label: "Crecimiento usuarios", value: "+22%", sub: "vs mes anterior", trend: "este mes", positive: true },
  { label: "Tasa de publicación", value: "34%", sub: "usuarios que publican activos", trend: "+5%", positive: true },
  { label: "NPS estimado", value: "72", sub: "Basado en actividad", trend: "Excelente", positive: true },
  { label: "Retención 30 días", value: "68%", sub: "Usuarios activos volvieron", trend: "+8%", positive: true },
];

export default function AdminMetricsPage() {
  const [datePreset, setDatePreset] = useState("30 días");

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between pb-8 border-b border-fog-gray">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray">Métricas y Reportes</h1>
          <p className="text-base text-slate-gray mt-1">Dashboard analítico de la plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Presets */}
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
          <Button icon={<Download className="h-4 w-4" />} variant="secondary">
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {KPIS.map((kpi) => (
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

      {/* Main Chart: Growth */}
      <div className="mt-8 bg-white border border-fog-gray rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-carbon-gray">Crecimiento de Usuarios y Activos</h3>
            <p className="text-sm text-slate-gray mt-0.5">Evolución acumulada en el período</p>
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
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={GROWTH_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ border: "1px solid #E5E7EB", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Line type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="assets" stroke="#059669" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white border border-fog-gray rounded-xl p-6">
          <h3 className="text-lg font-semibold text-carbon-gray mb-6">Distribución por Categorías</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {CATEGORY_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {CATEGORY_DATA.map((cat) => (
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
        </div>

        {/* Top Assets by Requests */}
        <div className="bg-white border border-fog-gray rounded-xl p-6">
          <h3 className="text-lg font-semibold text-carbon-gray mb-6">Top Activos por Solicitudes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={TOP_ASSETS_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="solicitudes" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="mt-6 bg-white border border-fog-gray rounded-xl p-6">
        <h3 className="text-lg font-semibold text-carbon-gray mb-6">Embudo de Conversión</h3>
        <div className="space-y-2">
          {FUNNEL_DATA.map((step, i) => {
            const pct = i === 0 ? 100 : Math.round((step.value / FUNNEL_DATA[0].value) * 100);
            return (
              <div key={step.name} className="flex items-center gap-4">
                <span className="text-sm text-slate-gray w-44 shrink-0 text-right">{step.name}</span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-8 bg-fog-gray rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all"
                      style={{ width: `${pct}%`, backgroundColor: step.fill }}
                    />
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-sm font-bold text-carbon-gray">{step.value.toLocaleString()}</span>
                    <span className="text-xs text-slate-gray ml-1">({pct}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
