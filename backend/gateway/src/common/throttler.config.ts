import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rutas de autenticación sensibles a fuerza bruta.
 * Se comparan contra el path CON el prefijo global (`/api/v1/...`).
 */
export const AUTH_SENSITIVE_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/oauth/callback',
];

/** Path sin query string, robusto ante middlewares que reescriben `req.url`. */
export function requestPath(req: { originalUrl?: string; path?: string; url?: string }): string {
  const raw = req.originalUrl ?? req.url ?? req.path ?? '';
  const q = raw.indexOf('?');
  return q === -1 ? raw : raw.slice(0, q);
}

export function isAuthSensitiveRequest(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest();
  const path = requestPath(req).replace(/\/+$/, '') || '/';
  return AUTH_SENSITIVE_PATHS.includes(path);
}

/**
 * Dos throttlers con nombre:
 *  - `default`: límite general (RATE_LIMIT_TTL / RATE_LIMIT_MAX).
 *  - `auth`:    límite estricto solo sobre login/register/forgot-password/reset-password
 *               (RATE_LIMIT_AUTH_TTL / RATE_LIMIT_AUTH_MAX).
 *
 * Los skips comunes (health check, IPs de confianza) viven en GatewayThrottlerGuard.shouldSkip():
 * un `skipIf` por-throttler REEMPLAZA al común en @nestjs/throttler v5, no se suman.
 */
export function buildThrottlerOptions(config: ConfigService): ThrottlerModuleOptions {
  return {
    errorMessage: 'Demasiadas solicitudes. Intentá de nuevo en unos instantes.',
    throttlers: [
      {
        name: 'auth',
        ttl: Number(config.get('RATE_LIMIT_AUTH_TTL', 60000)),
        limit: Number(config.get('RATE_LIMIT_AUTH_MAX', 5)),
        // Solo aplica a las rutas de auth sensibles; el resto lo saltea.
        skipIf: (context) => !isAuthSensitiveRequest(context),
      },
      {
        name: 'default',
        ttl: Number(config.get('RATE_LIMIT_TTL', 60000)),
        limit: Number(config.get('RATE_LIMIT_MAX', 100)),
      },
    ],
  };
}
