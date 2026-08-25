import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Defensa en profundidad sobre el rol admin.
 *
 * El gateway ya bloquea `/api/v1/admin` para no-admins (ADMIN_PREFIX_ROUTES en
 * `gateway/src/common/auth.middleware.ts`), pero eso es UNA sola capa: si
 * alguien alcanza el puerto 3006 sin pasar por el gateway —service discovery
 * interno, un port-forward, un compañero de red en Railway, el propio dev con
 * curl— hasta acá no había NADA que lo frenara.
 *
 * Verificado contra el servicio corriendo, ANTES de este guard:
 *
 *   POST /api/v1/admin/moderation/log
 *     -H 'x-user-id: emprendedor1' -H 'x-user-role: entrepreneur'
 *   -> HTTP 201, log de moderación escrito con adminId=emprendedor1
 *
 *   GET /api/v1/admin/dashboard   (sin ningún header)
 *   -> HTTP 200 con todas las métricas del negocio
 *
 * O sea: un emprendedor podía firmar decisiones de moderación sobre activos
 * ajenos, y las métricas del MVP eran públicas para cualquiera que llegara al
 * puerto. El rol se corta acá, en el borde, y no en cada método del service.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.headers['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
