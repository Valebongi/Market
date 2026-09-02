"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  UserX,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { RoleBadge } from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { cn, formatDate } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/http";
import { useAuth } from "@/lib/auth-context";
import {
  authService,
  type AdminIdentityNotice,
  type AdminNoticeSeverity,
} from "@/services/auth.service";
import type { UserRole, UserStatus } from "@/types";

// ─────────────────────────────────────────────────────────────────────
// Este panel escribe la IDENTIDAD EFECTIVA, no la copia cosmética.
//
// Hasta acá llamaba a `PATCH /users/:id/role` y `PATCH /users/:id/status`
// (users-service), que escriben la tabla que ESTE listado lee y nada más:
// cambiar un rol ahí no cambiaba el rol con el que el gateway autoriza, y
// suspender ahí no le impedía a nadie loguearse. El panel mostraba la acción
// como exitosa y no pasaba nada.
//
// Ahora usa `authService.adminUpdateRole/adminUpdateStatus`, que pegan contra
// auth-service — la base que firma el JWT y la que el login consulta. Esas
// funciones devuelven el resultado JUNTO con sus avisos (`notices`, tupla no
// vacía), y este archivo los renderiza todos: sin eso el panel cambiaría una
// mentira por otra, porque "usuario suspendido" a secas sigue sin ser cierto
// mientras su sesión abierta siga viva.
// ─────────────────────────────────────────────────────────────────────

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

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  asset_owner: "Titular",
  entrepreneur: "Emprendedor",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Activo",
  suspended: "Suspendido",
};

function isTargetStatus(value: string): value is UserStatus {
  return value === "active" || value === "suspended";
}

// ── Avisos ────────────────────────────────────────────────────────────
/*
 * La jerarquía la manda `severity`, que viene del service. No se reinterpreta
 * acá: `critical` significa "el admin puede creer que pasó algo protector que
 * NO pasó" y por eso se ve como se ve — borde grueso, coral, y el modal no se
 * cierra haciendo click afuera.
 *
 * Los textos tampoco se reescriben en esta pantalla: vienen redactados desde
 * `services/auth.service.ts` justamente para que no se suavicen distinto en
 * cada lugar donde se muestren.
 */
const NOTICE_STYLE: Record<
  AdminNoticeSeverity,
  { box: string; icon: string; title: string; detail: string }
> = {
  critical: {
    box: "bg-red-50 border-2 border-soft-coral",
    icon: "text-soft-coral",
    title: "text-soft-coral font-bold text-base",
    detail: "text-carbon-gray text-sm",
  },
  warning: {
    box: "bg-amber-50 border border-amber-300",
    icon: "text-warm-amber",
    title: "text-warm-amber font-semibold text-sm",
    detail: "text-carbon-gray text-sm",
  },
  info: {
    box: "bg-snow-gray border border-fog-gray",
    icon: "text-slate-gray",
    title: "text-carbon-gray font-semibold text-sm",
    detail: "text-slate-gray text-sm",
  },
};

function NoticeIcon({
  severity,
  className,
}: {
  severity: AdminNoticeSeverity;
  className?: string;
}) {
  if (severity === "critical") return <ShieldAlert className={className} aria-hidden="true" />;
  if (severity === "warning") return <AlertTriangle className={className} aria-hidden="true" />;
  return <Info className={className} aria-hidden="true" />;
}

function NoticeCard({ notice }: { notice: AdminIdentityNotice }) {
  const style = NOTICE_STYLE[notice.severity];
  return (
    <div
      className={cn("flex gap-3 p-4 rounded-xl", style.box)}
      role={notice.severity === "critical" ? "alert" : "status"}
    >
      <NoticeIcon severity={notice.severity} className={cn("h-5 w-5 shrink-0 mt-0.5", style.icon)} />
      <div className="min-w-0">
        <p className={style.title}>{notice.title}</p>
        <p className={cn("mt-1 leading-relaxed", style.detail)}>{notice.detail}</p>
      </div>
    </div>
  );
}

// ── Resultado de una operación ────────────────────────────────────────
interface OutcomeSection {
  key: string;
  headline: string;
  message: string;
  notices: readonly AdminIdentityNotice[];
}

interface OutcomeFailure {
  title: string;
  detail: string;
}

interface Outcome {
  subject: string;
  /** Lo que SÍ se aplicó. Puede estar vacío si falló la primera operación. */
  sections: OutcomeSection[];
  failure: OutcomeFailure | null;
  /** Operación que quedó sin intentar porque la anterior falló. */
  notAttempted: string | null;
}

/**
 * Traduce el error del backend a algo que el admin pueda accionar.
 *
 * El único genérico es el `default`, y ahí justamente NO se afirma que no se
 * haya modificado nada: sin respuesta, eso no se sabe.
 */
function describeFailure(err: unknown, what: "rol" | "estado", userId: string): OutcomeFailure {
  const status = err instanceof ApiError ? err.status : 0;
  const server = err instanceof Error && err.message ? err.message : "";
  const echo = server ? ` Respuesta del servidor: ${server}` : "";

  switch (status) {
    case 401:
      // El gateway responde 401 (no 403) cuando el token falta o venció: es lo
      // que devuelve producción hoy ante un header ausente.
      return {
        title: "Tu sesión no es válida",
        detail:
          "El gateway rechazó la petición porque el token falta o venció. Cerrá sesión, volvé a " +
          `entrar y reintentá. No se modificó nada.${echo}`,
      };
    case 403:
      return {
        title: `No tenés permiso para cambiar el ${what}`,
        detail:
          "El backend rechazó la operación: sólo una cuenta admin puede hacerla, y el permiso se " +
          "decide por el rol que lleva tu token, no por lo que muestre esta pantalla. Si tu rol " +
          "cambió hace poco, cerrá sesión y volvé a entrar para que el token se emita de nuevo. " +
          `No se modificó nada.${echo}`,
      };
    case 400:
      return {
        title: `El cambio de ${what} fue rechazado`,
        detail:
          "El backend lo considera inválido. Las causas posibles son: estás operando sobre tu " +
          "propia cuenta (un admin no puede cambiarse el rol ni el estado a sí mismo), el valor " +
          `elegido no es válido, o la cuenta está dada de baja. No se modificó nada.${echo}`,
      };
    case 404:
      return {
        title: "No existe la cuenta de acceso",
        detail:
          `auth-service no tiene ninguna cuenta con el id ${userId}, aunque el perfil sí aparezca ` +
          "en este listado. El listado y la fuente de verdad están desalineados: no se modificó " +
          "nada, y a este usuario no se lo puede administrar desde acá hasta que eso se resuelva.",
      };
    case 409:
      return {
        title: "Hay más de una cuenta con ese email",
        detail:
          "Existen dos cuentas cuyo email difiere sólo en mayúsculas y el backend no adivina cuál " +
          `es. Reintentá identificando la cuenta por su id: ${userId}. No se modificó nada.`,
      };
    default:
      return {
        title: `No se pudo cambiar el ${what}`,
        detail:
          (server || "No hubo respuesta del servidor.") +
          " No se puede afirmar que el cambio no se haya aplicado: recargá el listado antes de " +
          "reintentar.",
      };
  }
}

// ── Desfasajes entre la fuente de verdad y este listado ───────────────
/**
 * Lo que ya es cierto en auth-service pero este listado todavía no refleja.
 *
 * `GET /users` lee la copia de users-service. Cuando `profileSync` no es `ok`,
 * el cambio quedó aplicado donde manda y la fila sigue mostrando el valor
 * viejo: en vez de pisarla de forma optimista (que sería volver a mentir, y
 * además se revertiría al recargar) se deja el valor del servidor y se marca
 * el desfasaje al lado.
 */
interface EffectiveDelta {
  /** Rol efectivo, cuando difiere del que muestra la fila. */
  role?: UserRole;
  /** Estado efectivo, cuando difiere del que muestra la fila. */
  status?: UserStatus;
  /** Ventana en la que una cuenta recién suspendida todavía puede operar. */
  sessionAlive?: string;
}

function withDelta(
  prev: Record<string, EffectiveDelta>,
  userId: string,
  next: EffectiveDelta
): Record<string, EffectiveDelta> {
  const clean: EffectiveDelta = {};
  if (next.role) clean.role = next.role;
  if (next.status) clean.status = next.status;
  if (next.sessionAlive) clean.sessionAlive = next.sessionAlive;

  const out = { ...prev };
  if (Object.keys(clean).length === 0) delete out[userId];
  else out[userId] = clean;
  return out;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfileRaw[]>([]);
  const [deltas, setDeltas] = useState<Record<string, EffectiveDelta>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [editUser, setEditUser] = useState<UserProfileRaw | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("entrepreneur");
  const [editStatus, setEditStatus] = useState<UserProfileRaw["status"]>("active");
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

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
      const fresh = res.data ?? [];
      setUsers(fresh);
      setTotal(res.total ?? 0);
      // Si la réplica ya se puso al día, el desfasaje deja de existir. Las
      // filas que no volvieron en esta página conservan su marca: que no las
      // veamos acá no prueba que se hayan sincronizado.
      setDeltas((prev) => {
        let out = prev;
        for (const row of fresh) {
          const delta = out[row.userId];
          if (!delta) continue;
          const next: EffectiveDelta = { ...delta };
          if (next.role === row.role) delete next.role;
          if (next.status === row.status) delete next.status;
          out = withDelta(out, row.userId, next);
        }
        return out;
      });
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [search, roleFilter, statusFilter]);

  const hasFilters = !!search || roleFilter !== "Todos" || statusFilter !== "Todos";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("Todos");
    setStatusFilter("Todos");
  };

  const isSelf = (user: UserProfileRaw) => !!currentUser && currentUser.id === user.userId;

  /** Escribe el rol efectivo y devuelve la sección de resultado. Propaga el error. */
  async function applyRoleChange(target: UserProfileRaw, role: UserRole): Promise<OutcomeSection> {
    const { result, message, notices } = await authService.adminUpdateRole(target.userId, role);
    const synced = result.profileSync === "ok";

    if (synced) {
      setUsers((prev) =>
        prev.map((u) => (u.userId === target.userId ? { ...u, role: result.role } : u))
      );
    }
    setDeltas((prev) => {
      const next: EffectiveDelta = { ...(prev[target.userId] ?? {}) };
      if (synced) delete next.role;
      else next.role = result.role;
      return withDelta(prev, target.userId, next);
    });

    return {
      key: "role",
      headline: result.changed
        ? `Rol: ${ROLE_LABEL[result.previousRole]} → ${ROLE_LABEL[result.role]}`
        : `Rol: sigue en ${ROLE_LABEL[result.role]}`,
      message,
      notices,
    };
  }

  /** Escribe el estado efectivo y devuelve la sección de resultado. Propaga el error. */
  async function applyStatusChange(
    target: UserProfileRaw,
    status: UserStatus
  ): Promise<OutcomeSection> {
    const { result, message, notices } = await authService.adminUpdateStatus(target.userId, status);
    const synced = result.profileSync === "ok";

    if (synced) {
      setUsers((prev) =>
        prev.map((u) => (u.userId === target.userId ? { ...u, status: result.status } : u))
      );
    }
    setDeltas((prev) => {
      const next: EffectiveDelta = { ...(prev[target.userId] ?? {}) };
      if (synced) delete next.status;
      else next.status = result.status;
      // La ventana de sesión viva sobrevive al cierre del modal a propósito:
      // el aviso crítico no puede depender de que el admin lo recuerde.
      if (result.status === "suspended") next.sessionAlive = result.existingSessionMaxLifetime;
      else delete next.sessionAlive;
      return withDelta(prev, target.userId, next);
    });

    const previous = isTargetStatus(result.previousStatus)
      ? STATUS_LABEL[result.previousStatus]
      : result.previousStatus;

    return {
      key: "status",
      headline: result.changed
        ? `Estado: ${previous} → ${STATUS_LABEL[result.status]}`
        : `Estado: sigue en ${STATUS_LABEL[result.status]}`,
      message,
      notices,
    };
  }

  async function toggleStatus(user: UserProfileRaw) {
    if (busyUserId) return;
    const next: UserStatus = user.status === "active" ? "suspended" : "active";
    const subject = user.contactEmail ?? user.displayName;
    setBusyUserId(user.userId);
    try {
      const section = await applyStatusChange(user, next);
      setOutcome({ subject, sections: [section], failure: null, notAttempted: null });
    } catch (err) {
      setOutcome({
        subject,
        sections: [],
        failure: describeFailure(err, "estado", user.userId),
        notAttempted: null,
      });
    } finally {
      setBusyUserId(null);
    }
  }

  function openEdit(user: UserProfileRaw) {
    setEditUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
  }

  async function saveEdit() {
    if (!editUser) return;
    const target = editUser;
    const subject = target.contactEmail ?? target.displayName;
    const wantsRole = editRole !== target.role;
    const wantsStatus = isTargetStatus(editStatus) && editStatus !== target.status;

    if (!wantsRole && !wantsStatus) {
      setEditUser(null);
      return;
    }

    const sections: OutcomeSection[] = [];
    let failure: OutcomeFailure | null = null;
    let notAttempted: string | null = null;

    setSaving(true);
    try {
      if (wantsRole) {
        try {
          sections.push(await applyRoleChange(target, editRole));
        } catch (err) {
          failure = describeFailure(err, "rol", target.userId);
        }
      }
      if (wantsStatus && isTargetStatus(editStatus)) {
        if (failure) {
          // El rol y el estado se rechazan por las mismas razones (403, cuenta
          // propia, cuenta de baja). Insistir sólo agregaría un segundo error
          // idéntico; lo honesto es decir que no se intentó.
          notAttempted = "El cambio de estado no se intentó: la operación anterior falló.";
        } else {
          try {
            sections.push(await applyStatusChange(target, editStatus));
          } catch (err) {
            failure = describeFailure(err, "estado", target.userId);
          }
        }
      }
    } finally {
      setSaving(false);
    }

    // Un solo modal a la vez: el de edición se cierra antes de abrir el resultado.
    setEditUser(null);
    setOutcome({ subject, sections, failure, notAttempted });
  }

  const outcomeHasCritical =
    outcome?.sections.some((s) => s.notices.some((n) => n.severity === "critical")) ?? false;

  const outcomeTitle = !outcome
    ? ""
    : outcome.failure
      ? outcome.sections.length > 0
        ? "El cambio se aplicó a medias"
        : "El cambio no se aplicó"
      : "Cambio aplicado";

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
            ) : users.map((user) => {
              const delta = deltas[user.userId];
              const self = isSelf(user);
              const busy = busyUserId === user.userId;
              return (
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
                    {delta?.role && (
                      <p
                        className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warm-amber whitespace-nowrap"
                        title="El rol efectivo ya cambió en auth-service, pero la copia que alimenta este listado no se actualizó."
                      >
                        <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                        Efectivo: {ROLE_LABEL[delta.role]}
                      </p>
                    )}
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
                    {delta?.status && (
                      <p
                        className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warm-amber whitespace-nowrap"
                        title="El estado efectivo ya cambió en auth-service, pero la copia que alimenta este listado no se actualizó."
                      >
                        <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                        Efectivo: {STATUS_LABEL[delta.status]}
                      </p>
                    )}
                    {delta?.sessionAlive && (
                      <p
                        className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-soft-coral whitespace-nowrap"
                        title="Suspender corta los inicios de sesión nuevos, no la sesión abierta. El token que el usuario ya tiene sigue siendo válido y le permite publicar, mensajear y cerrar acuerdos durante esa ventana."
                      >
                        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        Sesión abierta: válida hasta {delta.sessionAlive} más
                      </p>
                    )}
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
                        disabled={self || busy}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          self || busy
                            ? "text-fog-gray cursor-not-allowed"
                            : cn(
                                "hover:bg-snow-gray",
                                user.status === "active"
                                  ? "text-slate-gray hover:text-soft-coral"
                                  : "text-slate-gray hover:text-deep-emerald"
                              )
                        )}
                        title={
                          self
                            ? "No podés cambiar el estado de tu propia cuenta"
                            : user.status === "active"
                              ? "Suspender"
                              : "Activar"
                        }
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.status === "active" ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          // Un padrón vacío no es una búsqueda fallida: hay que decirlo distinto.
          hasFilters ? (
            <EmptyState
              size="sm"
              title="No se encontraron usuarios"
              description="Ningún usuario coincide con la búsqueda o los filtros aplicados."
              action={{ label: "Limpiar filtros", onClick: clearFilters, variant: "link" }}
            />
          ) : (
            <EmptyState
              size="sm"
              title="Todavía no hay usuarios registrados"
              description="Las cuentas van a aparecer acá a medida que se registren."
            />
          )
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
            <Button
              onClick={saveEdit}
              loading={saving}
              disabled={saving || (!!editUser && isSelf(editUser))}
            >
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

            {isSelf(editUser) && (
              <div className="flex gap-3 p-4 rounded-xl bg-snow-gray border border-fog-gray" role="status">
                <Info className="h-5 w-5 shrink-0 mt-0.5 text-slate-gray" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-carbon-gray">Es tu propia cuenta</p>
                  <p className="mt-1 text-sm text-slate-gray leading-relaxed">
                    auth-service rechaza que un admin se cambie el rol o el estado a sí mismo: si
                    pudiera, degradarse por error dejaría la plataforma sin administrador, y una
                    suspensión entre admins se levantaría sola. Pedíselo a otro administrador.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Rol</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                disabled={isSelf(editUser)}
                className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue disabled:bg-snow-gray disabled:text-slate-gray disabled:cursor-not-allowed"
              >
                <option value="asset_owner">Titular</option>
                <option value="entrepreneur">Emprendedor</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-gray">
                El rol nuevo empieza a valer recién cuando el usuario vuelve a iniciar sesión: el
                token que ya tiene en la mano sigue llevando el anterior.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">Estado</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserProfileRaw["status"])}
                disabled={isSelf(editUser)}
                className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white focus:outline-none focus:border-electric-blue disabled:bg-snow-gray disabled:text-slate-gray disabled:cursor-not-allowed"
              >
                {/* Estado que no se puede elegir pero que hay que poder ver: sin
                    esta opción el select aparecía vacío y guardar movía la cuenta
                    a "activo" sin que nadie lo hubiera pedido. */}
                {editUser.status === "pending_verification" && (
                  <option value="pending_verification" disabled>Pendiente de verificación</option>
                )}
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-gray">
                Suspender bloquea los inicios de sesión nuevos. No corta la sesión que el usuario
                ya tenga abierta.
              </p>
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

      {/* Resultado de la operación — reemplaza al `alert()` y al éxito silencioso */}
      <Modal
        isOpen={!!outcome}
        onClose={() => setOutcome(null)}
        title={outcomeTitle}
        description={outcome?.subject}
        size="lg"
        // Con un aviso crítico en pantalla, cerrar de casualidad haciendo click
        // afuera es justo lo que no queremos: hay que acusar recibo.
        closeOnOverlay={!outcomeHasCritical}
        footer={
          <Button
            variant={outcomeHasCritical ? "destructive" : "primary"}
            onClick={() => setOutcome(null)}
          >
            {outcomeHasCritical ? "Entendido: la sesión sigue activa" : "Entendido"}
          </Button>
        }
      >
        {outcome && (
          <div className="space-y-4">
            {outcome.sections.map((section) => (
              <div key={section.key} className="space-y-3">
                <div className="px-4 py-3 bg-snow-gray rounded-xl">
                  <p className="text-sm font-semibold text-carbon-gray">{section.headline}</p>
                  {section.message && (
                    <p className="text-xs text-slate-gray mt-0.5">{section.message}</p>
                  )}
                </div>
                {section.notices.map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} />
                ))}
              </div>
            ))}

            {outcome.failure && (
              <div className="flex gap-3 p-4 rounded-xl bg-red-50 border-2 border-soft-coral" role="alert">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-soft-coral" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-base font-bold text-soft-coral">{outcome.failure.title}</p>
                  <p className="mt-1 text-sm text-carbon-gray leading-relaxed">
                    {outcome.failure.detail}
                  </p>
                  {outcome.notAttempted && (
                    <p className="mt-2 text-sm font-medium text-carbon-gray">
                      {outcome.notAttempted}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
