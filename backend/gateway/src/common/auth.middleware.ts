import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Routes that require admin role
const ADMIN_ROUTES = [
  '/api/v1/admin',
  '/api/v1/users',           // full list (admin only)
];

// Routes that only require authentication (any role)
const PROTECTED_ROUTES = [
  '/api/v1/assets',          // POST/PUT/DELETE
  '/api/v1/requests',
  '/api/v1/domains',
];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Inject user info as headers for downstream services
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-email'] = payload.email;
      req.headers['x-user-role'] = payload.role;

      // Check admin-only routes
      const isAdminRoute = ADMIN_ROUTES.some((r) => req.path.startsWith(r));
      if (isAdminRoute && payload.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      next();
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
