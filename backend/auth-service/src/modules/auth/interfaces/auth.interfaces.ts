export type UserRole = 'buyer' | 'seller' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export interface AuthTokenPayload {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface OAuthCallbackPayload {
  provider: string;
  providerId: string;
  email: string;
  name: string;
}
