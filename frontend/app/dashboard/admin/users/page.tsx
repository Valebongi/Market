"use client";

import { useState } from "react";
import { Search, Eye, Edit2, UserX, UserCheck } from "lucide-react";
import { RoleBadge } from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "asset_owner" | "entrepreneur";
  status: "active" | "suspended";
  registeredAt: string;
  lastLogin: string;
  assets: number;
  requests: number;
}

const MOCK_USERS: AdminUser[] = [
  { id: "1", name: "María García", email: "maria@example.com", role: "asset_owner", status: "active", registeredAt: "2024-01-15T00:00:00Z", lastLogin: "2024-02-18T10:00:00Z", assets: 12, requests: 34 },
  { id: "2", name: "Juan Rodríguez", email: "juan@startup.co", role: "entrepreneur", status: "active", registeredAt: "2024-01-20T00:00:00Z", lastLogin: "2024-02-17T15:00:00Z", assets: 0, requests: 8 },
  { id: "3", name: "Ana López", email: "ana@design.com", role: "asset_owner", status: "active", registeredAt: "2024-02-01T00:00:00Z", lastLogin: "2024-02-15T09:00:00Z", assets: 6, requests: 15 },
  { id: "4", name: "Carlos Martínez", email: "carlos@corp.com", role: "entrepreneur", status: "suspended", registeredAt: "2024-01-10T00:00:00Z", lastLogin: "2024-02-10T12:00:00Z", assets: 0, requests: 2 },
  { id: "5", name: "Admin Principal", email: "admin@davinci.com", role: "admin", status: "active", registeredAt: "2024-01-01T00:00:00Z", lastLogin: "2024-02-18T08:00:00Z", assets: 0, requests: 0 },
];

const ROLE_FILTERS = ["Todos", "admin", "asset_owner", "entrepreneur"];
const STATUS_FILTERS = ["Todos", "Activos", "Suspendidos"];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "Todos" || u.role === roleFilter;
    const matchStatus = statusFilter === "Todos" || (statusFilter === "Activos" && u.status === "active") || (statusFilter === "Suspendidos" && u.status === "suspended");
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Gestión de Usuarios</h1>
        <p className="text-base text-slate-gray mt-1">{MOCK_USERS.length} usuarios registrados en la plataforma</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mt-6 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue transition-colors"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 border border-fog-gray rounded-lg text-sm bg-white text-carbon-gray focus:outline-none"
        >
          {ROLE_FILTERS.map((r) => <option key={r}>{r === "asset_owner" ? "Titular" : r === "entrepreneur" ? "Emprendedor" : r}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-fog-gray rounded-lg text-sm bg-white text-carbon-gray focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-snow-gray border-b border-fog-gray">
            <tr>
              {["Usuario", "Email", "Rol", "Registrado", "Último acceso", "Activos", "Solicitudes", "Estado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wide text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-fog-gray last:border-0 hover:bg-snow-gray transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} size="sm" />
                    <span className="text-sm font-medium text-carbon-gray whitespace-nowrap">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-gray">{user.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-gray whitespace-nowrap">{formatDate(user.registeredAt, { year: "numeric", month: "short", day: "numeric" })}</td>
                <td className="px-4 py-3 text-xs text-slate-gray whitespace-nowrap">{formatDate(user.lastLogin, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3 text-sm text-center text-carbon-gray">{user.assets}</td>
                <td className="px-4 py-3 text-sm text-center text-carbon-gray">{user.requests}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", user.status === "active" ? "bg-emerald-50 text-deep-emerald" : "bg-red-50 text-soft-coral")}>
                    {user.status === "active" ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 text-slate-gray hover:text-electric-blue rounded-lg hover:bg-snow-gray transition-colors" title="Ver perfil">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditUser(user)} className="p-1.5 text-slate-gray hover:text-electric-blue rounded-lg hover:bg-snow-gray transition-colors" title="Editar">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      className={cn("p-1.5 rounded-lg hover:bg-snow-gray transition-colors", user.status === "active" ? "text-slate-gray hover:text-soft-coral" : "text-slate-gray hover:text-deep-emerald")}
                      title={user.status === "active" ? "Suspender" : "Activar"}
                    >
                      {user.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-gray">No se encontraron usuarios</div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Editar Usuario"
        description={editUser?.email}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button>Guardar Cambios</Button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-snow-gray rounded-xl">
              <Avatar name={editUser.name} size="md" />
              <div>
                <p className="font-semibold text-carbon-gray">{editUser.name}</p>
                <p className="text-sm text-slate-gray">{editUser.email}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Rol</label>
              <select className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue">
                <option value="asset_owner">Titular</option>
                <option value="entrepreneur">Emprendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Estado</label>
              <select className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue">
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Notas internas</label>
              <textarea
                rows={3}
                placeholder="Observaciones sobre este usuario..."
                className="w-full px-4 py-3 border border-fog-gray rounded-xl text-sm focus:outline-none focus:border-electric-blue resize-none"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-gray">Activos publicados</p>
                <p className="text-lg font-bold text-carbon-gray">{editUser.assets}</p>
              </div>
              <div>
                <p className="text-xs text-slate-gray">Solicitudes</p>
                <p className="text-lg font-bold text-carbon-gray">{editUser.requests}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
