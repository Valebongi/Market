import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * LÍMITES DE ESCRITURA POR USUARIO.
 *
 * El throttler del gateway es POR IP y global (100/min). No sirve acá por dos
 * razones: una IP rota da cupo infinito, y 100/min ya alcanzan para inundar a
 * un tercero. El problema de este servicio no es el volumen HTTP, es que CADA
 * escritura genera una notificación en la bandeja de OTRA persona:
 *
 *   - `POST /requests` notifica a `ownerId`, que lo declara el cliente y no se
 *     valida contra assets-service. Verificado en local: 25 llamadas seguidas
 *     con un `assetId` y un `ownerId` inventados dejaron 25 notificaciones en
 *     la bandeja de una víctima que no publicó nada.
 *   - `POST /requests/:id/messages` notifica a la contraparte. 50 mensajes de
 *     una sentada = 50 notificaciones.
 *
 * Mientras `ownerId` siga siendo autodeclarado, el cupo por usuario es el único
 * techo real de ese abuso. Se cuenta contra la base y no en memoria a propósito:
 * un reinicio o una segunda réplica no deben regalar cupo.
 */

interface Ventana {
  ms: number;
  max: number;
  motivo: string;
}

function num(env: string | undefined, porDefecto: number): number {
  const n = Number(env);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : porDefecto;
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function limitesDeSolicitudes() {
  return {
    porHora: num(process.env.MSG_RATE_REQUESTS_PER_HOUR, 10),
    porDia: num(process.env.MSG_RATE_REQUESTS_PER_DAY, 40),
    porTitularPorDia: num(process.env.MSG_RATE_REQUESTS_PER_OWNER_PER_DAY, 5),
  };
}

export function limitesDeMensajes() {
  return {
    porMinuto: num(process.env.MSG_RATE_MESSAGES_PER_MINUTE, 20),
    porHora: num(process.env.MSG_RATE_MESSAGES_PER_HOUR, 300),
  };
}

function userIdDe(context: ExecutionContext): string {
  const req = context.switchToHttp().getRequest<Request>();
  const userId = req.headers['x-user-id'];
  // UserContextGuard (de controller) ya corrió; se revalida por si este guard
  // se reusa en otra ruta. Un `undefined` acá contaría filas de TODO el mundo.
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new UnauthorizedException('Missing user context');
  }
  return userId;
}

function excederCupo(motivo: string): never {
  throw new HttpException(motivo, HttpStatus.TOO_MANY_REQUESTS);
}

@Injectable()
export class CreateRequestRateLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requesterId = userIdDe(context);
    const req = context.switchToHttp().getRequest<Request>();
    // El guard corre ANTES del ValidationPipe: el body todavía es crudo.
    const ownerId = (req.body as Record<string, unknown> | undefined)?.ownerId;

    const ahora = Date.now();
    const limites = limitesDeSolicitudes();

    const ventanas: Ventana[] = [
      {
        ms: HORA,
        max: limites.porHora,
        motivo: 'Alcanzaste el máximo de solicitudes de licencia por hora. Probá más tarde.',
      },
      {
        ms: DIA,
        max: limites.porDia,
        motivo: 'Alcanzaste el máximo de solicitudes de licencia por día. Probá mañana.',
      },
    ];

    const conteos = await Promise.all(
      ventanas.map((v) =>
        this.prisma.licenseRequest.count({
          where: { requesterId, createdAt: { gte: new Date(ahora - v.ms) } },
        }),
      ),
    );

    ventanas.forEach((v, i) => {
      if (conteos[i] >= v.max) excederCupo(v.motivo);
    });

    // Cupo por CONTRAPARTE: sin esto, el cupo diario entero se puede descargar
    // sobre una sola víctima. Es el límite anti-hostigamiento dirigido.
    if (typeof ownerId === 'string' && ownerId.trim() !== '') {
      const haciaEseTitular = await this.prisma.licenseRequest.count({
        where: { requesterId, ownerId, createdAt: { gte: new Date(ahora - DIA) } },
      });
      if (haciaEseTitular >= limites.porTitularPorDia) {
        excederCupo('Ya enviaste demasiadas solicitudes a este titular en las últimas 24 horas.');
      }
    }

    return true;
  }
}

@Injectable()
export class SendMessageRateLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const senderId = userIdDe(context);
    const ahora = Date.now();
    const limites = limitesDeMensajes();

    const ventanas: Ventana[] = [
      { ms: MINUTO, max: limites.porMinuto, motivo: 'Estás enviando mensajes demasiado rápido.' },
      { ms: HORA, max: limites.porHora, motivo: 'Alcanzaste el máximo de mensajes por hora.' },
    ];

    const conteos = await Promise.all(
      ventanas.map((v) =>
        this.prisma.message.count({
          where: { senderId, createdAt: { gte: new Date(ahora - v.ms) } },
        }),
      ),
    );

    ventanas.forEach((v, i) => {
      if (conteos[i] >= v.max) excederCupo(v.motivo);
    });

    return true;
  }
}
