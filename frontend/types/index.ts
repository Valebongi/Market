// ── Auth ──────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "asset_owner" | "entrepreneur";
  profile?: {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
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

export interface LicenseRequest {
  id: string;
  assetId: string;
  assetTitle?: string;
  requesterId: string;
  ownerId: string;
  status: RequestStatus;
  message?: string;
  messages?: RequestMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
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

// ── Users ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
  location?: string;
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
