/**
 * Path de la request normalizado: CON el prefijo global (`/api/v1/...`),
 * SIN query string y SIN barra final.
 *
 * Se lee de `originalUrl` a propósito, no de `req.path`:
 *
 * Nest monta los middlewares con `app.use('/api/v1/*', ...)`. Express se lleva
 * todo el path matcheado a `req.baseUrl` y deja `req.path === '/'`, así que
 * cualquier comparación contra `req.path` dentro de un middleware es siempre
 * falsa. `originalUrl` conserva la URL entera tal como llegó, y es la misma
 * fuente que usa el rate limiting (por eso ese sí funciona).
 *
 * Esta es la ÚNICA fuente de path para comparar rutas en el gateway: middleware,
 * guards y config comparan todos contra `/api/v1/...`.
 *
 * SE DEVUELVE EN MINÚSCULAS a propósito. El routing de Express es
 * case-insensitive: `@All('admin/*')` matchea `/api/v1/ADMIN/*` y el downstream
 * (también Express) trata `/auth/LOGIN` como `login`. Pero las comparaciones del
 * gateway son contra constantes en minúsculas, así que sin normalizar el case un
 * atacante con solo cambiar una letra:
 *   - atravesaba el chequeo de rol admin (`/api/v1/ADMIN/...` → 200 como no-admin), y
 *   - esquivaba el throttle anti fuerza bruta de auth (`/api/v1/auth/LOGIN` caía al
 *     límite general de 100/min en vez del estricto de 5/min).
 * El path solo se usa para CLASIFICAR rutas; el proxy reenvía `req.url` intacto,
 * así que el downstream sigue recibiendo el case original.
 *
 * Nota: el `.exclude()` de `app.module.ts` es la excepción legítima — lo matchea
 * el propio Nest contra los paths SIN prefijo, y no pasa por este helper.
 */
export function requestPath(req: {
  originalUrl?: string;
  path?: string;
  url?: string;
}): string {
  const raw = req.originalUrl ?? req.url ?? req.path ?? '';
  const q = raw.indexOf('?');
  const withoutQuery = q === -1 ? raw : raw.slice(0, q);
  // La barra final se saca para que `/api/v1/users/` matchee igual que `/api/v1/users`.
  return withoutQuery.replace(/\/+$/, '').toLowerCase() || '/';
}
