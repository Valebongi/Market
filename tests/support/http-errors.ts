/**
 * Aserciones sobre excepciones de NestJS SIN usar `instanceof`.
 *
 * Cada servicio tiene su propia copia de @nestjs/common en su node_modules, asi
 * que `err instanceof ForbiddenException` comparado contra la clase de OTRA
 * copia da false aunque el error sea del tipo correcto. Se compara el codigo
 * HTTP, que ademas es lo que realmente ve el cliente: si un 403 se degrada a
 * 401, el frontend muestra "sesion expirada" en vez de "no tenes permiso".
 */

export const FORBIDDEN = 403;
export const NOT_FOUND = 404;
export const CONFLICT = 409;
export const UNAUTHORIZED = 401;
export const BAD_REQUEST = 400;

function statusDe(err: any): number | undefined {
  if (!err) return undefined;
  if (typeof err.getStatus === 'function') return err.getStatus();
  return err.status;
}

/** Corre `fn` y devuelve el status HTTP de la excepcion, o 'SIN_ERROR'. */
export async function statusDeError(fn: () => Promise<unknown>): Promise<number | 'SIN_ERROR'> {
  try {
    await fn();
    return 'SIN_ERROR';
  } catch (err) {
    const s = statusDe(err);
    if (s === undefined) throw err; // No es una HttpException: que se vea el error real.
    return s;
  }
}

/** Afirma que `fn` rechaza con ese status HTTP exacto. */
export async function esperarStatus(fn: () => Promise<unknown>, esperado: number) {
  expect(await statusDeError(fn)).toBe(esperado);
}

/** Afirma que `fn` resuelve sin excepcion. */
export async function esperarOk(fn: () => Promise<unknown>) {
  expect(await statusDeError(fn)).toBe('SIN_ERROR');
}
