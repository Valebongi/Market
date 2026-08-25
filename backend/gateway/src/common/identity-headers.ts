import { NextFunction, Request, Response } from 'express';

/**
 * Headers de identidad que el gateway inyecta hacia los microservicios.
 *
 * Los servicios CONFIAN en ellos y no revalidan el JWT (ver _CONTEXTO-COMPARTIDO),
 * asi que su UNICA fuente legitima es `AuthMiddleware`, derivandolos del token.
 * Cualquier valor que venga del cliente es una suplantacion de identidad.
 */
export const IDENTITY_HEADERS = ['x-user-id', 'x-user-email', 'x-user-role'] as const;

const IDENTITY_HEADER_SET: ReadonlySet<string> = new Set(IDENTITY_HEADERS);

/**
 * Borra de la request los `x-user-*` que haya mandado el cliente.
 *
 * POR QUE ES INCONDICIONAL: en las rutas protegidas `AuthMiddleware` los pisa
 * con los valores del token, asi que ahi no se notaba. Pero las rutas del
 * `.exclude()` de app.module.ts NO pasan por ese middleware, y hasta ahora los
 * headers falsificados llegaban intactos al microservicio. Con eso, cualquier
 * endpoint publico que decidiera algo mirando `x-user-id` era falsificable sin
 * siquiera tener una cuenta.
 *
 * Despues de este borrado, un `x-user-*` que vea un microservicio solo puede
 * haberlo puesto el gateway.
 *
 * Los nombres de header son case-insensitive en HTTP. Node ya los normaliza a
 * minusculas en `req.headers`, pero igual se compara en minusculas y se recorre
 * el objeto entero en vez de borrar tres claves fijas: asi `X-User-Id` o
 * `X-USER-ROLE` no dependen de esa normalizacion para ser eliminados.
 */
export function stripClientIdentityHeaders(req: {
  headers?: Record<string, unknown>;
}): void {
  const headers = req?.headers;
  if (!headers) return;
  for (const name of Object.keys(headers)) {
    if (IDENTITY_HEADER_SET.has(name.toLowerCase())) delete headers[name];
  }
}

/**
 * Middleware Express que aplica el borrado.
 *
 * Se registra en `main.ts` con `app.use()` ANTES de cualquier otra cosa, no como
 * middleware de Nest. Dos razones:
 *   1. Los middlewares que Nest registra desde `configure()` se montan recien en
 *      `app.init()`, o sea DESPUES de los `app.use()` del bootstrap: este corre
 *      primero, siempre, incluido antes de `AuthMiddleware`.
 *   2. Nest monta sus middlewares bajo el prefijo global y respeta el
 *      `.exclude()`. Este va sobre el Express desnudo, asi que alcanza a TODA
 *      ruta — las excluidas, las que no matchean ningun controller y las que
 *      esten fuera de `/api/v1`. No hay path por donde esquivarlo.
 */
export function identityHeaderScrubber(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  stripClientIdentityHeaders(req);
  next();
}
