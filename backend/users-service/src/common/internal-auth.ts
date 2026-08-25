import * as crypto from 'crypto';

/**
 * Cabecera que auth-service manda en su llamada interna a
 * `POST /users/profiles`. NO puede llegar desde afuera: el proxy del gateway
 * reenvía únicamente `Content-Type` y los tres `x-user-*` que él mismo inyecta
 * (ver `gateway/src/modules/proxy/proxy.service.ts`), así que cualquier
 * `x-internal-token` que mande un cliente por `/api/v1/users/...` se descarta
 * antes de salir del gateway.
 */
export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

/**
 * Comparación en tiempo constante y tolerante a longitudes distintas: se
 * comparan los digest SHA-256, que siempre miden 32 bytes, así `timingSafeEqual`
 * nunca tira por longitudes desparejas ni filtra el largo del secreto.
 */
export function secretsMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}
