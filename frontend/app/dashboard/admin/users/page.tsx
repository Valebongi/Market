"use client";

import { useState, useEffect } from "react";
import { Search, Edit2, UserX, UserCheck } from "lucide-react";
import { RoleBadge } from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/http";

interface UserProfileRaw {
  id: string;
  userId: string;
  displayName: string;
  contactEmail: string | null;
  avatarUrl: string | null;
  role: "admin" | "asset_owner" | "entrepreneur";
  status: "active" | "suspended" | "pending_verification";
  assetCount: number;
  licenseCount: number;
  createdAt: string;
}

interface PaginatedResponse {
  data: UserProfileRaw[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLE_FILTERS = ["Todos", "admin", "asset_owner", "entrepreneur"];
const STATUS_FILTERS = ["Todos", "Activos", "Suspendidos"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfileRaw[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [editUser, setEditUser] = useState<UserProfileRaw | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (roleFilter !== "Todos") params.set("role", roleFilter);
      if (statusFilter === "Activos") params.set("status", "active");
      if (statusFilter === "Suspendidos") params.set("status", "suspended");

      const res = await apiFetch<PaginatedResponse>(`/users?${params.toString()}`);
      setUsers(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [search, roleFilter, statusFilter]);

  async function toggleStatus(user: UserProfileRaw) {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      await apiFetch(`/users/${user.userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setUsers((prev) => prev.map((u) => u.userId === user.userId ? { ...u, status: newStatus as UserProfileRaw["status"] } : u));
    } catch {
      alert("No se pudo actualizar el estado.");
    }
  }

  function openEdit(user: UserProfileRaw) {
    setEditUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      if (editRole !== editUser.role) {
        await apiFetch(`/users/${editUser.userId}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role: editRole }),
        });
      }
      if (editStatus !== editUser.status) {
        await apiFetch(`/users/${editUser.userId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: editStatus }),
        });
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === editUser.userId
            ? { ...u, role: editRole as UserProfileRaw["role"], status: editStatus as UserProfileRaw["status"] }
            : u
        )
      );
      setEditUser(null);
    } catch {
      alert("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-wide mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Gestión de Usuarios</h1>
        <p className="text-base text-slate-gray mt-1">
          {loading ? "Cargando..." : `${total} usuarios registrados en la plataforma`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mt-6 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
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
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>
              {r === "asset_owner" ? "Titular" : r === "entrepreneur" ? "Emprendedor" : r}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-fog-gray rounded-lg text-sm bg-white text-carbon-gray focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-soft-coral">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-fog-gray rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-snow-gray border-b border-fog-gray">
            <tr>
              {["Usuario", "Email", "Rol", "Registrado", "Activos", "Licencias", "Estado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wide text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-slate-gray">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-electric-blue" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cargando usuarios...
                  </div>
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.userId} className="border-b border-fog-gray last:border-0 hover:bg-snow-gray transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.displayName} src={user.avatarUrl ?? undefined} size="sm" />
                    <span className="text-sm font-medium text-carbon-gray whitespace-nowrap">{user.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-gray">{user.contactEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-gray whitespace-nowrap">
                  {formatDate(user.createdAt, { year: "numeric", month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3 text-sm text-center text-carbon-gray">{user.assetCount}</td>
                <td className="px-4 py-3 text-sm text-center text-carbon-gray">{user.licenseCount}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", user.status === "active" ? "bg-emerald-50 text-deep-emerald" : "bg-red-50 text-soft-coral")}>
                    {user.status === "active" ? "Activo" : user.status === "suspended" ? "Suspendido" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-slate-gray hover:text-electric-blue rounded-lg hover:bg-snow-gray transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleStatus(user)}
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
        {!loading && users.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-gray">No se encontraron usuarios</div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Editar Usuario"
        description={editUser?.contactEmail ?? editUser?.displayName}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-snow-gray rounded-xl">
              <Avatar name={editUser.displayName} src={editUser.avatarUrl ?? undefined} size="md" />
              <div>
                <p className="font-semibold text-carbon-gray">{editUser.displayName}</p>
                <p className="text-sm text-slate-gray">{editUser.contactEmail ?? "—"}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Rol</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue"
              >
                <option value="asset_owner">Titular</option>
                <option value="entrepreneur">Emprendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Estado</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue"
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>

            <div className="flex gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-gray">Activos publicados</p>
                <p className="text-lg font-bold text-carbon-gray">{editUser.assetCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-gray">Licencias</p>
                <p className="text-lg font-bold text-carbon-gray">{editUser.licenseCount}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
