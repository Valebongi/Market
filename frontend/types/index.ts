// ============================================================
// TIPOS GLOBALES – DA VINCI INVENTA
// ============================================================

// --- Usuarios ---
export type UserRole = "admin" | "asset_owner" | "entrepreneur";
export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  contactEmail?: string;
  avatarUrl?: string;
  website?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Activos ---
export type AssetType =
  | "software"
  | "brand"
  | "design"
  | "business_model"
  | "content"
  | "project"
  | "other";

export type LicenseType = "exclusive" | "non_exclusive" | "temporary";

export type AssetStatus = "draft" | "published" | "flagged" | "archived";

export interface Asset {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  assetType: AssetType;
  licenseType: LicenseType;
  duration?: string;
  territory: string;
  status: AssetStatus;
  priceType: "fixed" | "range" | "negotiable";
  priceFixed?: number;
  priceFrom?: number;
  priceTo?: number;
  priceCurrency?: string;
  allowedUses?: string[];
  additionalConditions?: string;
  externalLinks?: string[];
  previewUrls?: string[];
  tags: string[];
  viewCount: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: UserProfile;
  categories?: AssetCategory[];
}

export interface AssetCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  assetCount?: number;
}

// --- Solicitudes de Licencia ---
export type LicenseRequestStatus = "pending" | "accepted" | "rejected";

export interface LicenseRequest {
  id: string;
  assetId: string;
  requesterId: string;
  ownerId: string;
  intendedUse: string;
  duration?: string;
  budget?: string;
  status: LicenseRequestStatus;
  createdAt: string;
  asset?: Asset;
  requester?: UserProfile;
  owner?: UserProfile;
  messages?: Message[];
}

// --- Mensajes ---
export interface Message {
  id: string;
  licenseRequestId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: UserProfile;
}

// --- Dominios ---
export interface DomainSearch {
  id: string;
  userId: string;
  domainName: string;
  extension: string;
  available: boolean;
  price?: string;
  searchedAt: string;
}

export interface DomainResult {
  domain: string;
  available: boolean;
  price?: string;
  registrarUrl?: string;
}

// --- Moderación ---
export type ModerationAction = "flagged" | "approved" | "removed";

export interface ModerationLog {
  id: string;
  assetId: string;
  action: ModerationAction;
  reason?: string;
  createdAt: string;
}

// --- Métricas ---
export interface MetricDaily {
  id: string;
  metricName: string;
  value: number;
  date: string;
}

export interface DashboardStats {
  // Para titulares
  assetsPublished?: number;
  requestsReceived?: number;
  activeLicenses?: number;
  totalViews?: number;
  // Para emprendedores
  requestsSent?: number;
  activeConversations?: number;
  savedAssets?: number;
  domainSearches?: number;
}

// --- API Response ---
export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Filtros de Marketplace ---
export interface MarketplaceFilters {
  search?: string;
  categories?: string[];
  licenseType?: LicenseType | "all";
  assetType?: AssetType | "all";
  priceFrom?: number;
  priceTo?: number;
  territory?: string;
  sortBy?: "newest" | "most_viewed" | "most_requested";
  page?: number;
  limit?: number;
}
