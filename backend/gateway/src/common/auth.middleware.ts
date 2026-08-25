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

// Routes that require admin role on the route and everything under it.
const ADMIN_ROUTE_PREFIXES = [
  '/api/v1/admin',
];

// Routes that require admin role only on an exact match.
// `/api/v1/users` es el listado completo (admin only), pero `/api/v1/users/:id/...`
// son recursos del propio usuario (perfil, notificaciones, guardados): si se
// matchea por prefijo, el dueño de la cuenta recibe 403 sobre sus propios datos.
const ADMIN_EXACT_ROUTES = [
  '/api/v1/users',
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

      // Check admin-only routes. `req.path` ya viene sin query string, se le saca
      // la barra final para que `/api/v1/users/` y `/api/v1/users` matcheen igual.
      const path = req.path.replace(/\/+$/, '') || '/';
      const isAdminRoute =
        ADMIN_EXACT_ROUTES.includes(path) ||
        ADMIN_ROUTE_PREFIXES.some((r) => path === r || path.startsWith(`${r}/`));
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
