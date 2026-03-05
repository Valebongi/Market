// Shared types and utilities across all microservices

export type UserRole = 'admin' | 'asset_owner' | 'entrepreneur';
export type UserStatus = 'active' | 'suspended';
export type AssetStatus = 'draft' | 'published' | 'flagged' | 'archived';
export type LicenseType = 'exclusive' | 'non_exclusive' | 'temporary';
export type AssetType = 'software' | 'brand' | 'design' | 'business_model' | 'content' | 'project' | 'other';
export type LicenseRequestStatus = 'pending' | 'accepted' | 'rejected';
export type ModerationAction = 'flagged' | 'approved' | 'removed';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ApiSuccessResponse<T = unknown> {
  statusCode: number;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page = 1,
  limit = 12,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  return {
    data: items.slice(offset, offset + limit),
    total,
    page,
    limit,
    totalPages,
  };
}
