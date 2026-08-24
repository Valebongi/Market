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
  priceType: "fixed" | "negotiable";
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
export interface DomainResult {
  domain: string;
  available: boolean;
  price?: number;
  currency?: string;
}

export interface DomainSearchResponse {
  query: string;
  results: DomainResult[];
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
