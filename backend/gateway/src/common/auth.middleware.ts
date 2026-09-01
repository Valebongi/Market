import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { requestPath } from './request-path';

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

// NO agregues acá una lista de "rutas protegidas": no existe tal modelo.
// Este middleware NO decide qué rutas requieren auth — se aplica a TODO y lo
// único que lo esquiva es el `.exclude()` de app.module.ts. O sea: la regla es
// "todo protegido salvo lo excluido explícitamente", y esas dos listas de
// arriba son el ÚNICO refinamiento (exigir rol admin encima de la auth).
// Hubo acá una constante PROTECTED_ROUTES que nadie leía: describía un modelo
// de permisos inexistente y hacía creer que una ruta ausente de la lista
// quedaba desprotegida (o que agregarla la protegía). Ninguna de las dos.

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

      // Check admin-only routes.
      // NO usar `req.path`: Nest monta este middleware con `app.use('/api/v1/*', ...)`
      // y Express se lleva el path entero a `req.baseUrl`, dejando `req.path === '/'`.
      // Con eso el check de rol nunca matcheaba y cualquier usuario logueado
      // atravesaba el gateway hacia /api/v1/admin/*. `requestPath()` lee
      // `originalUrl` (misma fuente que usa el rate limiting, que sí funciona)
      // y devuelve el path sin query string ni barra final.
      const path = requestPath(req);
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
