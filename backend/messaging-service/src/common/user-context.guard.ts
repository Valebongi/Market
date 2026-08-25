import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * El gateway valida el JWT e inyecta `x-user-id`. Los servicios confían en ese
 * header, pero confiar NO puede significar asumir que está presente.
 *
 * Sin este guard, un request sin `x-user-id` llega al service con
 * `userId === undefined`, y Prisma trata un campo `undefined` en el `where`
 * como "sin filtro". Verificado contra Postgres real:
 *
 *   notification.findMany({ where: { userId: undefined } })
 *     -> devuelve las notificaciones de TODOS los usuarios
 *   notification.updateMany({ where: { userId: undefined, read: false } })
 *     -> marca como leídas las de TODOS los usuarios
 *
 * O sea: el filtro de tenencia desaparece en silencio en vez de fallar. Por eso
 * la identidad se corta acá, en el borde, y no en cada método del service.
 */
@Injectable()
export class UserContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = req.headers['x-user-id'];

    if (typeof userId !== 'string' || userId.trim() === '') {
      throw new UnauthorizedException('Missing user context');
    }

    return true;
  }
}

/**
 * Rol admin. El gateway solo exige admin en `/api/v1/admin` y `/api/v1/users`;
 * `/api/v1/requests/*` cae en "cualquier usuario autenticado". Así que el único
 * lugar donde se puede exigir admin sobre `GET /requests/all` es acá.
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
