import 'reflect-metadata';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/**
 * Harness de validacion de DTOs.
 *
 * POR QUE createRequire Y NO UN import NORMAL DE @nestjs/common:
 * los decoradores de un DTO (`@IsEnum`, `@IsString`, ...) registran metadata en
 * la instancia de `class-validator` que ESE archivo importa, o sea la que vive
 * en `backend/<servicio>/node_modules`. Si el ValidationPipe viniera de otra
 * copia (una instalada en la raiz), leeria un registry vacio: NO encontraria
 * ninguna regla y daria VERDE ante cualquier payload, incluso invalido.
 * Un test de contrato que no puede fallar es peor que no tener test.
 *
 * Por eso se resuelve `@nestjs/common` desde el directorio del propio servicio:
 * el pipe y el DTO comparten exactamente la misma copia de class-validator.
 * `probarQueElHarnessDetectaReglas()` verifica esta premisa en tiempo de test.
 */

const RAIZ_BACKEND = join(__dirname, '..', '..', 'backend');

export const PIPE_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
} as const;

export interface ValidationOutcome {
  ok: boolean;
  /** Mensajes crudos de class-validator (vacio si ok). */
  errors: string[];
  /** Instancia transformada del DTO (solo si ok). */
  value?: any;
}

function nestCommonDe(servicio: string) {
  const desde = join(RAIZ_BACKEND, servicio, 'package.json');
  return createRequire(desde)('@nestjs/common');
}

/**
 * Corre el ValidationPipe REAL del servicio contra el DTO REAL, con la misma
 * configuracion que `src/main.ts`. No se mockea nada de la frontera bajo prueba.
 */
export function crearValidador(servicio: string) {
  const { ValidationPipe, BadRequestException } = nestCommonDe(servicio);

  return async function validateDto(
    dtoClass: new (...args: any[]) => any,
    payload: unknown,
  ): Promise<ValidationOutcome> {
    const pipe = new ValidationPipe(PIPE_OPTIONS);
    const meta = { type: 'body', metatype: dtoClass, data: '' };
    try {
      const value = await pipe.transform(payload, meta);
      return { ok: true, errors: [], value };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        const res = err.getResponse() as { message?: string | string[] };
        const message = res?.message ?? [];
        return { ok: false, errors: Array.isArray(message) ? message : [message] };
      }
      throw err;
    }
  };
}

/**
 * Guarda contra el modo de fallo silencioso descrito arriba.
 *
 * Si por un cambio de instalacion el pipe dejara de ver la metadata de los
 * decoradores, TODOS los tests de contrato pasarian en verde sin validar nada.
 * Este chequeo lo detecta: exige que un payload que sabemos invalido sea
 * efectivamente rechazado. Se invoca desde cada spec de contrato.
 */
export function probarQueElHarnessDetectaReglas(
  validateDto: (dto: any, payload: unknown) => Promise<ValidationOutcome>,
  dtoClass: new (...args: any[]) => any,
  payloadInvalido: unknown,
) {
  it('[meta] el harness ve las reglas del DTO (si no, todo el archivo es un falso verde)', async () => {
    const res = await validateDto(dtoClass, payloadInvalido);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
}

/**
 * Carga un modulo desde el node_modules de un servicio concreto.
 * Necesario porque los specs viven en `tests/` y ahi `require` resuelve contra
 * la raiz. Usalo para cualquier dependencia que tenga que ser LA MISMA copia
 * que usa el servicio bajo prueba (class-validator, @nestjs/jwt, etc).
 */
export function requireDeServicio(servicio: string, modulo: string): any {
  const desde = join(RAIZ_BACKEND, servicio, 'package.json');
  return createRequire(desde)(modulo);
}
