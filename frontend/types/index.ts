// ── Auth ──────────────────────────────────────────────────────────────
export type UserRole = "admin" | "asset_owner" | "entrepreneur";
export type UserStatus = "active" | "suspended";

/**
 * Perfil que devuelve **auth-service** embebido en la respuesta de
 * `POST /auth/login`, `/auth/register` y `/auth/oauth/callback`.
 *
 * OJO: auth-service y users-service tienen tablas de perfil DISTINTAS y con
 * nombres de campo distintos (acá `linkedinUrl`, allá `linkedin`). Es deuda
 * conocida de doble fuente de verdad; hasta que se unifique, son dos tipos.
 * Ver `UserProfile` más abajo para el de users-service.
 */
export interface AuthProfile {
  id?: string;
  userId?: string;
  displayName: string;
  bio?: string | null;
  contactEmail?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Usuario de **sesión**: exactamente lo que viene en `data.user` del login y
 * lo que se persiste en `localStorage.davinci_user`.
 * NO es el perfil completo de users-service — para eso usá `UserProfile`.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: AuthProfile | null;
}

/** Payload de `POST /auth/login` y `/auth/register` (dentro de `data`). */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ── Admin de identidad (auth-service) ─────────────────────────────────
//
// `role` y `status` viven DUPLICADOS en dos bases: `auth.users` (auth-service)
// y `user_profiles` (users-service). Sólo la primera manda:
//   - el `role` de `auth.users` es el que auth-service firma en el JWT y con el
//     que el gateway autoriza;
//   - el `status` de `auth.users` es el que `login`/`oauthLogin` leen antes de
//     emitir un token.
// La copia de users-service es la que LISTA y FILTRA el panel, y nada más.
//
// Por eso los endpoints de abajo son `/auth/users/...` y no `/users/...`.
// Escribir la copia sin escribir la fuente de verdad es lo que hacía que el
// panel mintiera: cambiar un rol no cambiaba el rol efectivo y suspender a
// alguien no le impedía loguearse.

/**
 * Resultado de replicar el cambio a la copia de users-service.
 *
 * **Sólo `"ok"` significa que el listado del panel va a mostrar el valor
 * nuevo.** Con `"failed"` o `"skipped_no_token"` el cambio SÍ quedó aplicado
 * donde importa (auth-service ya lo escribió y no lo revierte), pero
 * `GET /users` va a seguir devolviendo el valor viejo hasta que la replicación
 * se repita con éxito — reintentar la misma operación es el modo de repararlo.
 *
 * - `ok` → las dos bases coinciden.
 * - `failed` → users-service rechazó o no respondió.
 * - `skipped_no_token` → auth-service corre sin `INTERNAL_SERVICE_TOKEN`, así
 *   que ni siquiera lo intentó. Es un problema de configuración, no de red.
 */
export type ProfileSyncOutcome = "ok" | "failed" | "skipped_no_token";

/**
 * `data` de `PATCH /auth/users/:identifier/role` — el shape crudo del backend.
 *
 * **Preferí el `AdminRoleChangeView` que devuelve `authService.adminUpdateRole()`**:
 * este tipo suelto deja renderizar el resultado sin los avisos que lo
 * acompañan.
 */
export interface AdminRoleChangeResult {
  /** userId (uuid) de la cuenta afectada, resuelto por el backend. */
  id: string;
  /** Email de la cuenta afectada, con la capitalización con la que está guardada. */
  email: string;
  /** Rol que quedó escrito en la fuente de verdad. */
  role: UserRole;
  /** Rol que tenía antes. Igual a `role` cuando `changed` es `false`. */
  previousRole: UserRole;
  /** `false` si la cuenta ya tenía ese rol (no-op idempotente, no un error). */
  changed: boolean;
  profileSync: ProfileSyncOutcome;
  /**
   * `true` cuando el rol cambió: el JWT que el usuario ya tiene en la mano
   * sigue llevando el rol viejo hasta que caduque o vuelva a iniciar sesión.
   * El gateway autoriza por el claim del token, no consultando la base.
   */
  tokenRefreshRequired: boolean;
}

/**
 * `data` de `PATCH /auth/users/:identifier/status` — el shape crudo del backend.
 *
 * **Preferí el `AdminStatusChangeView` que devuelve
 * `authService.adminUpdateStatus()`**: este tipo suelto deja renderizar
 * "suspendido" sin decir que la sesión abierta sigue viva.
 */
export interface AdminStatusChangeResult {
  id: string;
  email: string;
  /** Estado que quedó escrito en la fuente de verdad (la que lee el login). */
  status: UserStatus;
  previousStatus: UserStatus;
  /** `false` si la cuenta ya estaba en ese estado. */
  changed: boolean;
  profileSync: ProfileSyncOutcome;
  /** `true` mientras la cuenta esté `suspended`: no se emiten sesiones nuevas. */
  loginBlocked: boolean;
  /**
   * **Literal `false`, y no es un placeholder a completar más adelante.**
   *
   * Suspender NO revoca los JWT ya emitidos: el gateway valida la firma
   * localmente y nunca consulta la base de auth. Una sesión abierta sigue
   * operando con normalidad hasta que el token expire.
   *
   * Está tipado como el literal a propósito, para que un
   * `if (res.existingSessionsRevoked)` narre a `never` en la rama verdadera
   * en vez de compilar como si algún día pudiera cortar la sesión.
   */
  existingSessionsRevoked: false;
  /**
   * Cuánto puede seguir viva esa sesión, en el formato de `JWT_EXPIRES_IN`
   * (`"7d"` por defecto). Es el techo de la ventana en la que una cuenta
   * suspendida todavía puede escribir.
   */
  existingSessionMaxLifetime: string;
}

// ── Assets ────────────────────────────────────────────────────────────
export type AssetStatus = "draft" | "published" | "flagged" | "archived";
export type AssetCategory =
  | "software"
  | "brand"
  | "design"
  | "business_model"
  | "content"
  | "project"
  | "other";
export type LicenseType = "exclusive" | "non_exclusive" | "temporary";
export type PricingType = "fixed" | "negotiable" | "free";

export interface Asset {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  assetType: AssetCategory;
  licenseType: LicenseType;
  territory?: string;
  duration?: string;
  status: AssetStatus;
  /**
   * Espejo 1:1 de `pricingType` del backend — los TRES valores, incluido
   * `"free"`. `mapAsset` lo preserva: un activo gratuito NO es "precio fijo 0".
   * Al renderizar, `"free"` se muestra como "Gratis", no como "$0".
   */
  priceType: PricingType;
  /** `undefined` si `priceType === "negotiable"`; `0` si es `"free"`. */
  priceFixed?: number;
  priceCurrency: string;
  allowedUses: string[];
  additionalConditions?: string;
  tags: string[];
  externalLinks: string[];
  previewUrls: string[];
  coverImageUrl?: string;
  viewCount: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    displayName: string;
    avatarUrl?: string;
    linkedin?: string;
  };
}

export interface RawAsset {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  category: AssetCategory;
  licenseType: LicenseType;
  territory?: string;
  duration?: string;
  status: AssetStatus;
  pricingType: PricingType;
  price?: number;
  currency?: string;
  allowedUses?: string[];
  restrictions?: string[];
  tags?: Array<{ tag: string }>;
  links?: Array<{ label: string; url: string; isMain?: boolean }>;
  coverImageUrl?: string;
  viewCount?: number;
  requestCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Un link tal como lo acepta el backend al ESCRIBIR (`links[]` del DTO). */
export interface AssetLinkInput {
  label: string;
  url: string;
  isMain?: boolean;
}

/**
 * Body de `POST /assets` — espejo exacto de `CreateAssetDto` de assets-service.
 *
 * NO confundir con `RawAsset`, que es el modelo de **lectura**. El mismo campo
 * cambia de forma según la dirección:
 *
 * | campo | escritura (este tipo) | lectura (`RawAsset`)          |
 * |-------|-----------------------|-------------------------------|
 * | tags  | `string[]`            | `Array<{ tag: string }>`      |
 *
 * Mandar `Array<{tag}>` en el POST da **400** (`@IsString({each:true})`).
 * Por eso `assetsService.create/update` se tipan con estos payloads y no con
 * `Partial<RawAsset>`.
 *
 * Los enums van con las uniones reales del front, que coinciden campo a campo
 * con los `@IsEnum` del DTO: un valor inválido es error de compilación acá en
 * vez de un 400 en runtime.
 */
export interface CreateAssetPayload {
  /** 5..120 caracteres (validado en backend). */
  title: string;
  /** 50..5000 caracteres (validado en backend). */
  description: string;
  /** Es `assetType` en el modelo de lectura del front (`Asset`). */
  category: AssetCategory;
  licenseType: LicenseType;
  pricingType: PricingType;
  /** Máx. 2 decimales, >= 0. Se omite si `pricingType` no es `"fixed"`. */
  price?: number;
  currency?: string;
  territory?: string;
  duration?: string;
  allowedUses?: string[];
  /** Es `additionalConditions` (string) en `Asset`; acá es lista. */
  restrictions?: string[];
  /** `string[]` en escritura. En lectura vuelve como `Array<{ tag: string }>`. */
  tags?: string[];
  /** `externalLinks` + `previewUrls` de `Asset` unificados. `label: "preview"` marca preview. */
  links?: AssetLinkInput[];
  coverImageUrl?: string;
}

/**
 * Body de `PUT /assets/:id` — espejo de `UpdateAssetDto`
 * (`PartialType(CreateAssetDto)` + `status`).
 *
 * OJO con `status`: el backend sólo acepta `draft | published | archived`.
 * `"flagged"` existe en `AssetStatus` (lectura) pero lo setea moderación,
 * no el dueño: mandarlo da 400.
 */
export interface UpdateAssetPayload extends Partial<CreateAssetPayload> {
  status?: Exclude<AssetStatus, "flagged">;
}

/** Respuesta de `POST /assets/upload-image` (multipart, campo `file`). */
export interface AssetImageUploadResponse {
  url: string;
}

// ── Requests / Messaging ──────────────────────────────────────────────
export type RequestStatus = "pending" | "accepted" | "rejected" | "closed";

/** Estados a los que un usuario puede mover una solicitud (`PATCH /requests/:id/status`). */
export type RequestStatusTransition = "accepted" | "rejected" | "closed";

/**
 * Espejo del modelo Prisma `LicenseRequest` de messaging-service.
 * `assetTitle` e `initialMessage` son NOT NULL en la DB: no son opcionales.
 */
export interface LicenseRequest {
  id: string;
  assetId: string;
  assetTitle: string;
  requesterId: string;
  ownerId: string;
  status: RequestStatus;
  initialMessage: string;
  proposedTerms?: string | null;
  closedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Sólo viene en `GET /requests/mine` (último mensaje) y `GET /requests/:id` (todos). */
  messages?: RequestMessage[];
}

/** Body de `POST /requests` — espejo de `CreateRequestDto` de messaging-service. */
export interface CreateLicenseRequestPayload {
  assetId: string;
  /** Requerido por el backend: se denormaliza el título del activo. */
  assetTitle: string;
  ownerId: string;
  /** Requerido. El backend valida 20..2000 caracteres. */
  initialMessage: string;
  /** Opcional. Máx. 1000 caracteres. */
  proposedTerms?: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// ── Domains ───────────────────────────────────────────────────────────
/**
 * Resultado de RDAP para un dominio.
 * - `available`  → libre, confirmado por RDAP.
 * - `registered` → ocupado, confirmado por RDAP.
 * - `unknown`    → no se pudo confirmar (TLD fuera del bootstrap de IANA,
 *                  timeout, rate limit). `available` llega en `false`, pero
 *                  eso NO significa "ocupado": significa "no lo sabemos".
 *                  La UI debería distinguirlo de `registered`.
 */
export type DomainStatus = "available" | "registered" | "unknown";

/**
 * Precio de referencia de un TLD, tal como lo publica el registrador.
 *
 * **`firstYear` y `renewal` son ambos obligatorios y viajan juntos a
 * propósito.** La brecha entre uno y otro es enorme en varios TLDs
 * (`.tech`: 6,99 → 50,98; `.online`: 1,96 → 28,84), así que mostrar sólo el
 * primer año es técnicamente cierto y prácticamente engañoso. No hay ninguna
 * forma válida de tener este objeto con un solo precio: si el backend no
 * conoce los dos, manda `pricing: null` entero.
 *
 * Para renderizar, preferí `toDomainPricingView()` de
 * `services/domains.service.ts`: devuelve los dos precios y el disclaimer
 * en una sola estructura, y no se puede construir sin el disclaimer.
 */
export interface TldPricing {
  /** ISO 4217, p. ej. `"USD"`. */
  currency: string;
  /** Precio del primer año de registro. */
  firstYear: number;
  /** Precio de renovación anual. NUNCA opcional: ver el doc del tipo. */
  renewal: number;
  /** ISO timestamp de cuándo se tomó el precio del registrador. */
  asOf: string;
  /**
   * Siempre `true`. Es un precio *de referencia*: el registrador cobra lo que
   * cobra en el momento del checkout. Obliga a acompañarlo del
   * `pricingDisclaimer` del envelope.
   */
  isReference: true;
  source: "porkbun";
}

/** Una oferta concreta de un registrador para un dominio disponible. */
export interface RegistrarOffer {
  registrar: "namecheap" | "porkbun";
  /** Nombre para mostrar, ya listo ("Namecheap", "Porkbun"). */
  registrarName: string;
  /**
   * Link de afiliación ya armado por el backend — es la vía de monetización.
   * USAR ESTE VALOR: mandar al usuario a la home del registrador pierde la
   * atribución.
   */
  url: string;
  /** `null` si no hay precio conocido para ese registrador + TLD. */
  pricing: TldPricing | null;
}

/**
 * Cómo se generó un dominio sugerido. Sólo viene en `suggestions`, nunca en
 * `results`.
 */
export type DomainSuggestionKind = "tld" | "prefix" | "suffix" | "hyphen";

/** Un dominio dentro de `results` o `suggestions` de `POST /domains/search`. */
export interface DomainResult {
  domain: string;
  /** La extensión con el punto: `".com"`, `".io"`, … */
  extension: string;
  /**
   * `true` sólo cuando RDAP lo confirmó libre. Un `status: "unknown"` llega
   * acá como `false`, a propósito. Para distinguir "ocupado" de "no sabemos",
   * mirá `status`.
   */
  available: boolean;
  /**
   * Link de afiliación principal (el primero de `offers`). `null` cuando el
   * dominio no está disponible.
   * Se mantiene por compatibilidad; si querés mostrar todas las opciones de
   * compra, usá `offers`.
   */
  registrarUrl: string | null;
  status: DomainStatus;
  /** Ofertas de compra. `[]` cuando `available === false`. */
  offers: RegistrarOffer[];
  /**
   * Precio de referencia del TLD. Sólo puede venir poblado si
   * `available === true`; es `null` cuando no hay pricing conocido o el
   * dominio está ocupado.
   *
   * Si esto se renderiza, el `pricingDisclaimer` del envelope es obligatorio
   * en la misma pantalla.
   */
  pricing: TldPricing | null;
  /** Sólo presente en `suggestions`. `undefined` en `results`. */
  suggestionKind?: DomainSuggestionKind;
}

/** Telemetría del chequeo, para debug y para decidir si mostrar precios. */
export interface DomainSearchMeta {
  rdapLookups: number;
  rdapCacheHits: number;
  rdapRetries: number;
  /**
   * `false` cuando el proveedor de precios no respondió: en ese caso todos los
   * `pricing` vienen en `null` y no hay que inventar un fallback.
   */
  pricingAvailable: boolean;
  /** ISO timestamp del chequeo. */
  checkedAt: string;
}

/** Respuesta de `POST /domains/search`. */
export interface DomainSearchResponse {
  /** La query cruda, tal como la tipeó el usuario. */
  query: string;
  /** La query sanitizada (`[^a-z0-9-] → -`) que se usó para armar los dominios. Vacía si no quedó nada buscable. */
  baseName: string;
  /** Los dominios pedidos explícitamente (query × extensiones). */
  results: DomainResult[];
  /** Alternativas generadas por el backend. Cada una trae `suggestionKind`. */
  suggestions: DomainResult[];
  /**
   * Texto legal que el backend manda ya redactado. **Es obligatorio mostrarlo
   * cuando hay cualquier precio en pantalla** (de `results`, de `suggestions`
   * o de `offers`). Viene del backend justamente para que la regla no dependa
   * de que cada pantalla se acuerde de escribirlo.
   *
   * `null` cuando no hay ningún precio en la respuesta.
   */
  pricingDisclaimer: string | null;
  meta: DomainSearchMeta;
}

/**
 * Un dominio dentro de `GET /domains/history`.
 *
 * **Deliberadamente más angosto que `DomainResult`.** El historial no trae
 * `pricing`, `offers` ni `registrarUrl`: un precio o un link al carrito
 * congelados hace días son información falsa en el momento en que alguien los
 * mira. Leer `pricing` de acá es un error de compilación, y así tiene que
 * quedar. Si hace falta un precio actual, hay que re-buscar el dominio.
 */
export interface DomainHistoryResult {
  domain: string;
  extension: string;
  /** Estado al momento de la búsqueda, no ahora. Etiquetalo como histórico. */
  available: boolean;
  status: DomainStatus;
}

/**
 * Fila de `GET /domains/history` — es el modelo Prisma `DomainSearch` de
 * domains-service: **una búsqueda entera** (con sus N dominios en `results`),
 * NO un `DomainSearchResponse`.
 */
export interface DomainSearchRecord {
  id: string;
  userId: string;
  query: string;
  results: DomainHistoryResult[];
  createdAt: string;
}

// ── Users (users-service) ─────────────────────────────────────────────
/**
 * Preferencias de notificación tal como las guarda users-service.
 * Los nombres de campo son los del modelo Prisma `NotificationSettings`:
 * NO son `newRequest`/`newMessage`/`assetUpdates`/`newsletter`/`weeklyReport`.
 */
export interface NotificationSettings {
  emailRequests: boolean;
  emailMessages: boolean;
  emailMarketing: boolean;
  emailDigest: boolean;
  emailSecurity: boolean;
}

/**
 * `GET /users/:userId` devuelve este objeto **plano** (no un `AuthUser` con
 * `profile` anidado). Es el modelo Prisma `UserProfile` de users-service con
 * `notificationSettings` incluido.
 */
export interface UserProfile {
  id: string;
  userId: string;
  role: UserRole;
  status: UserStatus;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  location?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  github?: string | null;
  assetCount: number;
  licenseCount: number;
  createdAt: string;
  updatedAt: string;
  notificationSettings?:
    | (NotificationSettings & { id: string; userId: string })
    | null;
}

/** Body de `PUT /users/:userId/profile` — espejo de `UpdateProfileDto`. */
export interface UpdateUserProfilePayload {
  displayName?: string;
  bio?: string;
  contactEmail?: string;
  website?: string;
  location?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  avatarUrl?: string;
}

// ── Shared API shapes ─────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T = unknown> {
  statusCode: number;
  data: T;
  message?: string;
}
