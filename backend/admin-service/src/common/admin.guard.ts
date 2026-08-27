import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Largo máximo aceptable para un id de usuario. Los ids son UUID v4 (36
 * caracteres); 128 deja margen para cualquier formato futuro y corta el header
 * de 8 KB que alguien mande para llenar la columna de auditoría de basura.
 */
const MAX_USER_ID_LENGTH = 128;

/**
 * Defensa en profundidad sobre el rol admin Y sobre la IDENTIDAD del admin.
 *
 * ── Capa 1: el rol ─────────────────────────────────────────────────────────
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
 * ── Capa 2: la identidad (esto es lo nuevo) ────────────────────────────────
 * Chequear el rol y NO chequear quién es no alcanza cuando lo que el endpoint
 * produce es un RASTRO DE AUDITORÍA. `adminId` sale del header `x-user-id` y
 * viajaba crudo hasta la columna `moderation_logs.admin_id` sin que nadie
 * mirara si venía, si estaba vacío o si era un id real.
 *
 * Verificado contra el controller real (Nest levantado, Prisma stubbeado para
 * ver qué se escribía), con `x-user-role: admin`:
 *
 *   x-user-id: ""                   -> HTTP 201, admin_id = ""
 *   x-user-id: "   "                -> HTTP 201, admin_id = ""
 *   x-user-id: "no-soy-un-usuario"  -> HTTP 201, admin_id = "no-soy-un-usuario"
 *   (sin x-user-id)                 -> el controller pasa adminId=undefined
 *
 * O sea: quien llegara al puerto podía firmar decisiones de moderación como
 * NADIE (id vacío) o —peor— como OTRO ADMIN, poniendo el id ajeno en el
 * header. En un marketplace donde la moderación decide qué activo se baja por
 * fraude, un registro de auditoría que se puede firmar con el nombre de otro
 * es peor que no tener registro: da falsa confianza.
 *
 * El guard no puede verificar que el id EXISTA —eso vive en auth-service y
 * este servicio no hace llamadas cruzadas— pero sí que esté presente, no
 * vacío y con forma sana. Lo que ata el id a un humano real sigue siendo la
 * firma del JWT en el gateway; esto es el piso que faltaba.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.headers['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const rawUserId = req.headers['x-user-id'];

    // Un header repetido llega como array. No se elige uno: es ambiguo, y la
    // ambigüedad en la identidad de quien modera no se resuelve adivinando.
    if (typeof rawUserId !== 'string') {
      throw new UnauthorizedException('Missing admin identity');
    }

    const userId = rawUserId.trim();

    if (userId === '' || userId.length > MAX_USER_ID_LENGTH) {
      throw new UnauthorizedException('Missing admin identity');
    }

    // Sin caracteres de control ni espacios en el medio: nada legítimo los
    // tiene, y son lo que se usa para ensuciar logs y grillas de auditoría.
    if (!/^[\w.@:-]+$/.test(userId)) {
      throw new UnauthorizedException('Invalid admin identity');
    }

    // Se normaliza para que lo que se escriba en la auditoría sea exactamente
    // lo que el guard validó, y no la versión sin trimear del header.
    req.headers['x-user-id'] = userId;

    return true;
  }
}
