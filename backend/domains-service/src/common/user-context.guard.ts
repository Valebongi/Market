import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * El gateway valida el JWT e inyecta `x-user-id`, pero confiar en el header no
 * puede significar asumir que está presente. Verificado antes de este guard:
 *
 *   POST /api/v1/domains/search  (sin x-user-id)
 *   -> prisma.domainSearch.create({ data: { userId: undefined, ... } })
 *   -> HTTP 500
 *
 * Mismo patrón que `messaging-service/src/common/user-context.guard.ts`.
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
