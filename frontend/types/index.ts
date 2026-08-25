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
 * Un dominio dentro de `results` de `POST /domains/search`. Verificado contra
 * la salida real de domains-service:
 *
 * ```json
 * { "domain": "x.com", "extension": ".com", "available": true,
 *   "registrarUrl": "https://www.namecheap.com/domains/registration/results/?domain=x.com" }
 * ```
 */
export interface DomainResult {
  domain: string;
  /** La extensión con el punto: `".com"`, `".io"`, … */
  extension: string;
  /**
   * `true` sólo cuando RDAP lo confirmó. Un `unknown` (TLD fuera del bootstrap
   * de IANA, timeout, rate limit) llega acá como `false`, a propósito.
   */
  available: boolean;
  /**
   * Link de afiliación (Namecheap) ya calculado por el backend — es la vía de
   * monetización. `null` cuando `available === false`.
   * USAR ESTE VALOR: mandar al usuario a la home del registrador pierde la
   * atribución de la afiliación.
   */
  registrarUrl: string | null;
  /**
   * NO EXISTEN. domains-service nunca devuelve precio: el chequeo es RDAP puro
   * y no consulta pricing de ningún registrador. Se declaran como `never` para
   * que leerlos no compile y no vuelvan a aparecer en la UI.
   * @deprecated el backend no manda este campo.
   */
  price?: never;
  /** @deprecated el backend no manda este campo. Ver `price`. */
  currency?: never;
}

/** Respuesta de `POST /domains/search`. */
export interface DomainSearchResponse {
  /** La query cruda, tal como la tipeó el usuario. */
  query: string;
  /** La query sanitizada (`[^a-z0-9-] → -`) que se usó para armar los dominios. Vacía si no quedó nada buscable. */
  baseName: string;
  results: DomainResult[];
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
  results: DomainResult[];
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
