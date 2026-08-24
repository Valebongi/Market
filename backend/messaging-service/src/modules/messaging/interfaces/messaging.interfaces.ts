export type LicenseRequestStatus = 'pending' | 'accepted' | 'rejected' | 'closed';

export interface MessageResponse {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface LicenseRequestResponse {
  id: string;
  assetId: string;
  assetTitle?: string;
  requesterId: string;
  ownerId: string;
  status: LicenseRequestStatus;
  messages: MessageResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRequests {
  data: LicenseRequestResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
