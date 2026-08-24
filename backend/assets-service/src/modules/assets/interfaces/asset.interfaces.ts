// Deben mantenerse en sync con los enums de prisma/schema.prisma.
export type AssetStatus = 'draft' | 'published' | 'flagged' | 'archived';
export type AssetType =
  | 'software'
  | 'design'
  | 'business_model'
  | 'content'
  | 'brand'
  | 'project'
  | 'other';
export type LicenseType = 'exclusive' | 'non_exclusive' | 'temporary';

export interface AssetTag {
  id: string;
  assetId: string;
  tag: string;
}

export interface AssetLink {
  id: string;
  assetId: string;
  label: string;
  url: string;
  isMain: boolean;
}

export interface AssetResponse {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  category: AssetType;
  licenseType: LicenseType;
  territory?: string;
  duration?: string;
  status: AssetStatus;
  pricingType: 'fixed' | 'negotiable' | 'free';
  price?: number;
  currency?: string;
  allowedUses: string[];
  restrictions: string[];
  viewCount: number;
  requestCount: number;
  tags: AssetTag[];
  links: AssetLink[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedAssets {
  data: AssetResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
