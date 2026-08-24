import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { requestPath } from './throttler.config';

/** Rutas que nunca deben consumir cupo (los balanceadores las golpean sin parar). */
const NEVER_THROTTLED = ['/health'];

function parseList(raw?: string): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Normaliza `::ffff:127.0.0.1` → `127.0.0.1` para comparar contra la lista de confianza. */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/**
 * ThrottlerGuard del gateway.
 *
 * - `shouldSkip()`: exime el health check y las IPs de confianza (p. ej. el server de
 *   Next.js, que hace fetch server-side y saldría con una única IP para todos los usuarios).
 * - `getTracker()`: usa `req.ip`, que respeta `trust proxy` de Express cuando el gateway
 *   corre detrás de nginx/Caddy (ver TRUST_PROXY en main.ts). Cae al socket si `req.ip`
 *   viene vacío, para no agrupar a todo el mundo bajo la misma clave `undefined`.
 */
@Injectable()
export class GatewayThrottlerGuard extends ThrottlerGuard {
  private readonly trustedIps: string[];

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
    this.trustedIps = parseList(process.env.RATE_LIMIT_TRUSTED_IPS).map(normalizeIp);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const req = context.switchToHttp().getRequest();
    const path = requestPath(req).replace(/\/+$/, '') || '/';
    if (NEVER_THROTTLED.includes(path)) return true;

    if (this.trustedIps.length > 0) {
      const ip = normalizeIp(await this.getTracker(req));
      if (this.trustedIps.includes(ip)) return true;
    }

    return false;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
  }
}
