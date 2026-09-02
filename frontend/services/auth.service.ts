import { apiFetch } from "@/lib/http";
import type {
  AdminRoleChangeResult,
  AdminStatusChangeResult,
  ApiSuccessResponse,
  AuthResponse,
  ProfileSyncOutcome,
  UserRole,
  UserStatus,
} from "@/types";

// ── Vistas de los cambios administrativos de identidad ────────────────
//
// Mismo patrón que `toDomainPricingView()` en `domains.service.ts`: el precio
// no se entrega sin su disclaimer, y acá el resultado de un cambio de rol o de
// estado no se entrega sin los avisos que lo califican.
//
// Los tres avisos que esto existe para que nadie se coma:
//   1. `profileSync !== "ok"` → el cambio se aplicó donde importa, pero el
//      listado del panel va a seguir mostrando el valor viejo.
//   2. `tokenRefreshRequired` → el usuario tiene que volver a iniciar sesión
//      para que el rol nuevo surta efecto.
//   3. `existingSessionsRevoked: false` → suspender NO corta la sesión activa.
//
// `adminUpdateRole()` y `adminUpdateStatus()` devuelven la vista, no el `data`
// crudo. Para renderizar el resultado sin los avisos hay que salirse del camino
// (llamar a `apiFetch` a mano), que es exactamente la fricción buscada.

/**
 * - `critical` → el admin puede creer que pasó algo protector que NO pasó.
 * - `warning`  → el cambio se aplicó, pero con una salvedad real.
 * - `info`     → nada que advertir; confirma lo que ocurrió.
 */
export type AdminNoticeSeverity = "critical" | "warning" | "info";

/** Identificador estable del aviso, para que la UI pueda ramificar sin parsear texto. */
export type AdminNoticeId =
  | "sessions_not_revoked"
  | "token_refresh_required"
  | "profile_out_of_sync"
  | "account_reactivated"
  | "no_change";

/** Aviso listo para renderizar. El texto viene armado para que no haya que redactarlo (ni suavizarlo) en cada pantalla. */
export interface AdminIdentityNotice {
  id: AdminNoticeId;
  severity: AdminNoticeSeverity;
  title: string;
  detail: string;
}

/**
 * Lista de avisos **garantizada no vacía por el tipo**: siempre hay al menos
 * uno, así que `notices[0]` es un `AdminIdentityNotice` y no
 * `AdminIdentityNotice | undefined`. Una UI que renderice `notices` nunca
 * queda sin nada que mostrar, y una que no la renderice deja un campo
 * obligatorio sin usar.
 *
 * El primer elemento es siempre el más importante del caso.
 */
export type AdminIdentityNotices = readonly [
  AdminIdentityNotice,
  ...AdminIdentityNotice[],
];

/** Resultado de `adminUpdateRole()`: lo aplicado y sus avisos, juntos. */
export interface AdminRoleChangeView {
  result: AdminRoleChangeResult;
  /** El `message` que redactó auth-service. Resumen, no reemplaza a `notices`. */
  message: string;
  notices: AdminIdentityNotices;
}

/** Resultado de `adminUpdateStatus()`: lo aplicado y sus avisos, juntos. */
export interface AdminStatusChangeView {
  result: AdminStatusChangeResult;
  message: string;
  notices: AdminIdentityNotices;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "administrador",
  asset_owner: "titular",
  entrepreneur: "emprendedor",
};

/**
 * Aviso de desincronización con la copia de users-service.
 *
 * `null` cuando `profileSync === "ok"`. En cualquier otro caso hay que
 * mostrarlo: el cambio quedó aplicado en la fuente de verdad, pero el listado
 * del panel miente hasta que la replicación se rehaga.
 */
function profileSyncNotice(
  sync: ProfileSyncOutcome,
  what: "rol" | "estado"
): AdminIdentityNotice | null {
  if (sync === "ok") return null;
  return {
    id: "profile_out_of_sync",
    severity: "warning",
    title: `El listado va a seguir mostrando el ${what} anterior`,
    detail:
      sync === "skipped_no_token"
        ? `El cambio de ${what} quedó aplicado donde manda, pero no se replicó al perfil ` +
          `porque auth-service corre sin INTERNAL_SERVICE_TOKEN. Es configuración del ` +
          `servidor, no un problema de red: hasta que se resuelva, esta pantalla va a ` +
          `mostrar el valor viejo por más que se recargue.`
        : `El cambio de ${what} quedó aplicado donde manda, pero la réplica al perfil ` +
          `falló. Esta pantalla va a mostrar el valor viejo hasta que la replicación ` +
          `funcione — repetir la misma operación es la forma de repararlo.`,
  };
}

/**
 * Arma la vista de un cambio de rol.
 *
 * Siempre devuelve al menos un aviso:
 * - si el rol cambió, el de `tokenRefreshRequired` (el usuario sigue operando
 *   con el rol viejo hasta re-loguearse);
 * - si no cambió, el no-op explícito, para que "no pasó nada" no se lea como
 *   "listo, ya está aplicado".
 */
export function toAdminRoleChangeView(
  envelope: ApiSuccessResponse<AdminRoleChangeResult>
): AdminRoleChangeView {
  const result = envelope.data;
  const nuevo = ROLE_LABEL[result.role] ?? result.role;
  const viejo = ROLE_LABEL[result.previousRole] ?? result.previousRole;

  const lead: AdminIdentityNotice = result.tokenRefreshRequired
    ? {
        id: "token_refresh_required",
        severity: "warning",
        title: "El usuario todavía opera con el rol anterior",
        detail:
          `El rol quedó en ${nuevo}, pero el token que ${result.email} ya tiene en la ` +
          `mano sigue llevando ${viejo}. El cambio surte efecto recién cuando cierre ` +
          `sesión y vuelva a entrar (o cuando el token expire). Avisale.`,
      }
    : {
        id: "no_change",
        severity: "info",
        title: "No se cambió nada",
        detail: `${result.email} ya tenía el rol ${nuevo}.`,
      };

  const sync = profileSyncNotice(result.profileSync, "rol");

  return {
    result,
    message: envelope.message ?? "",
    notices: sync ? [lead, sync] : [lead],
  };
}

/**
 * Arma la vista de un cambio de estado.
 *
 * Cuando la cuenta queda `suspended`, el primer aviso es SIEMPRE el de las
 * sesiones abiertas, y es `critical`: suspender corta los logins nuevos y nada
 * más. Un admin que suspende a alguien que está estafando gente necesita leer,
 * en esa misma pantalla, que no lo frenó.
 */
export function toAdminStatusChangeView(
  envelope: ApiSuccessResponse<AdminStatusChangeResult>
): AdminStatusChangeView {
  const result = envelope.data;
  const suspendida = result.status === "suspended";

  let lead: AdminIdentityNotice;
  if (suspendida) {
    lead = {
      id: "sessions_not_revoked",
      severity: result.changed ? "critical" : "warning",
      title: "La suspensión NO corta la sesión activa",
      detail:
        `${result.email} no puede volver a iniciar sesión, pero el token que ya tiene ` +
        `sigue siendo válido por hasta ${result.existingSessionMaxLifetime}. Durante esa ` +
        `ventana puede seguir operando con normalidad: publicar, mensajear y cerrar ` +
        `acuerdos. Suspender frena el ingreso, no lo que está haciendo ahora. Si hay ` +
        `que cortarlo ya, hace falta una acción adicional fuera de este panel.`,
    };
  } else if (result.changed) {
    lead = {
      id: "account_reactivated",
      severity: "info",
      title: "Cuenta reactivada",
      detail: `${result.email} ya puede volver a iniciar sesión.`,
    };
  } else {
    lead = {
      id: "no_change",
      severity: "info",
      title: "No se cambió nada",
      detail: `${result.email} ya estaba activa.`,
    };
  }

  const sync = profileSyncNotice(result.profileSync, "estado");

  return {
    result,
    message: envelope.message ?? "",
    notices: sync ? [lead, sync] : [lead],
  };
}

export const authService = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),

  /**
   * `POST /auth/oauth/callback` — espejo exacto de `OAuthCallbackDto` de
   * auth-service.
   *
   * El body es **sólo** `{ provider, credential }`:
   *
   * - `provider` hoy únicamente acepta `"google"`. El backend lo valida con
   *   `@IsIn(['google'])` y devuelve 400 con cualquier otro valor — GitHub está
   *   deshabilitado a propósito hasta que el intercambio del `code` viva dentro
   *   de auth-service.
   * - `credential` es el ID token de Google **entero y sin tocar** (el campo
   *   `credential` del callback de `google.accounts.id`). No lo decodifiques ni
   *   le saques claims: auth-service lo verifica contra el JWKS de Google
   *   (firma, `iss`, `aud`, `exp`, `email_verified`).
   *
   * La firma anterior era `{ provider, providerId, email, name }`. El cliente
   * afirmaba la identidad y el backend emitía un token confiando en ella, o sea
   * que postear el email de otro alcanzaba para llevarse su cuenta. Ese shape ya
   * no existe en ningún lado: el DTO corre con `forbidNonWhitelisted`, así que
   * mandar `email` "por las dudas" es un 400.
   */
  oauthCallback: (body: { provider: string; credential: string }) =>
    apiFetch<ApiSuccessResponse<AuthResponse>>("/auth/oauth/callback", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    }),

  /**
   * `PATCH /auth/users/:identifier/role` — cambia el rol EFECTIVO.
   *
   * Es el rol con el que auth-service firma el JWT y con el que el gateway
   * autoriza. `PATCH /users/:userId/role` (users-service) escribe otra tabla,
   * la que el panel lista: cambiar ahí no cambia lo que el usuario puede hacer.
   * Este endpoint replica al otro; el otro no replica a este.
   *
   * `identifier` acepta el userId (uuid) o el email (case-insensitive).
   * auth-service no expone listado, así que el email suele ser lo único que el
   * operador tiene a mano.
   *
   * Devuelve una `AdminRoleChangeView`: el resultado y sus avisos juntos.
   * Ver el bloque de arriba.
   *
   * Errores (`ApiError.status`):
   * - `403` quien llama no es admin, o el gateway no inyectó la identidad.
   * - `400` operar sobre la propia cuenta (un admin no puede degradarse solo),
   *   rol inválido, identificador malformado, o cuenta dada de baja.
   * - `404` no existe esa cuenta.
   * - `409` hay dos cuentas cuyo email difiere sólo en capitalización: no se
   *   adivina, hay que reintentar con el uuid.
   */
  adminUpdateRole: (identifier: string, role: UserRole) =>
    apiFetch<ApiSuccessResponse<AdminRoleChangeResult>>(
      `/auth/users/${encodeURIComponent(identifier)}/role`,
      { method: "PATCH", body: JSON.stringify({ role }) }
    ).then(toAdminRoleChangeView),

  /**
   * `PATCH /auth/users/:identifier/status` — suspende o reactiva de verdad.
   *
   * Es el `status` que `login` y `oauthLogin` leen antes de emitir un token.
   * `PATCH /users/:userId/status` (users-service) sólo cambia el badge del
   * panel: suspender por ahí no le impide a nadie loguearse.
   *
   * UN SOLO MÉTODO PARA LAS DOS DIRECCIONES: el estado destino va en el body.
   *
   * **Alcance real de la suspensión** — no le prometas más que esto a nadie:
   * corta los logins nuevos al instante, y NADA MÁS. Los JWT ya emitidos siguen
   * valiendo hasta que expiren, porque el gateway valida la firma localmente y
   * no consulta la base. La vista devuelta lo dice como aviso `critical`.
   *
   * `identifier` acepta uuid o email (case-insensitive). Mismos códigos de
   * error que `adminUpdateRole`, con `400` también para el estado inválido y
   * para operar sobre la propia cuenta — incluida la reactivación: si un admin
   * suspendido pudiera levantarse la suspensión con el token que le quedó vivo,
   * la sanción entre admins no existiría.
   */
  adminUpdateStatus: (identifier: string, status: UserStatus) =>
    apiFetch<ApiSuccessResponse<AdminStatusChangeResult>>(
      `/auth/users/${encodeURIComponent(identifier)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    ).then(toAdminStatusChangeView),
};
