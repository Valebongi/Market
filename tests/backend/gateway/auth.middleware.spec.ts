import 'reflect-metadata';
import { AuthMiddleware } from '../../../backend/gateway/src/common/auth.middleware';
import { statusDeError, UNAUTHORIZED, FORBIDDEN } from '../../support/http-errors';
import { requireDeServicio } from '../../support/validation';

// La MISMA copia de @nestjs/jwt que usa el gateway: si el dia de manana cambia
// de version o de algoritmo por defecto, el test lo acompana solo.
const { JwtService } = requireDeServicio('gateway', '@nestjs/jwt');
type JwtService = any;

/**
 * AUTORIZACION EN EL BORDE: el gateway valida el JWT e inyecta x-user-id /
 * x-user-email / x-user-role. Los servicios CONFIAN en esos headers y no
 * revalidan (ver _CONTEXTO-COMPARTIDO). Este middleware es el unico punto donde
 * se decide identidad y rol: si falla, no hay segunda linea de defensa.
 *
 * Nada esta mockeado: JwtService es el real y firma tokens de verdad.
 *
 * SOBRE EL FIXTURE: se construye la request como la entrega Express DE VERDAD.
 * Nest monta el middleware con `app.use('/api/v1/*', ...)`, asi que Express se
 * lleva el path matcheado a `baseUrl` y deja `req.path === '/'`. Un fixture que
 * solo setee `path` con la URL completa NO reproduce produccion y puede dar
 * verde sobre codigo roto.
 */

const SECRET = 'davinci-jwt-secret-dev-2024';

function crearMiddleware() {
  const jwt = new JwtService({ secret: SECRET });
  return { middleware: new AuthMiddleware(jwt), jwt };
}

function firmar(
  jwt: JwtService,
  payload: { sub: string; email: string; role: string },
  opts: { expiresIn?: string | number } = {},
) {
  return jwt.sign(payload, { secret: SECRET, expiresIn: opts.expiresIn ?? '7d' });
}

/**
 * Request tal como la ve un middleware montado en '/api/v1/*'.
 * `path` queda en '/' y `baseUrl` se come el resto — igual que en produccion.
 */
function crearReq(urlCompleta: string, token?: string, headersExtra: Record<string, string> = {}) {
  return {
    originalUrl: urlCompleta,
    url: urlCompleta,
    baseUrl: urlCompleta.split('?')[0],
    path: '/',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headersExtra,
    } as Record<string, string>,
  } as any;
}

async function correr(middleware: AuthMiddleware, req: any) {
  const next = jest.fn();
  await middleware.use(req, {} as any, next);
  return next;
}

/**
 * Corre el middleware y devuelve 'PASO' o el status HTTP de la excepcion.
 * Se compara el status y no la clase: el gateway tiene su propia copia de
 * @nestjs/common, asi que un `instanceof` contra otra copia daria false.
 * Ademas el status es lo que ve el cliente — 403 "no tenes permiso" y 401
 * "sesion expirada" disparan flujos distintos en el frontend.
 */
async function resultado(middleware: AuthMiddleware, req: any): Promise<number | string> {
  const next = jest.fn();
  const r = await statusDeError(async () => {
    await middleware.use(req, {} as any, next);
    if (next.mock.calls.length === 0) throw new Error('El middleware no llamo a next()');
  });
  return r === 'SIN_ERROR' ? 'PASO' : r;
}

describe('AuthMiddleware - presencia y validez del token', () => {
  it('rechaza una request sin header Authorization', async () => {
    const { middleware } = crearMiddleware();
    expect(await resultado(middleware, crearReq('/api/v1/assets'))).toBe(UNAUTHORIZED);
  });

  it('rechaza un esquema que no sea Bearer', async () => {
    const { middleware } = crearMiddleware();
    const req = crearReq('/api/v1/assets');
    req.headers.authorization = 'Basic abc123';
    expect(await resultado(middleware, req)).toBe(UNAUTHORIZED);
  });

  it('rechaza un token con basura', async () => {
    const { middleware } = crearMiddleware();
    expect(await resultado(middleware, crearReq('/api/v1/assets', 'no-es-un-jwt'))).toBe(
      UNAUTHORIZED,
    );
  });

  it('rechaza un token firmado con OTRO secreto', async () => {
    const { middleware } = crearMiddleware();
    const otroJwt = new JwtService({ secret: 'secreto-del-atacante' });
    const token = otroJwt.sign(
      { sub: 'u1', email: 'a@b.com', role: 'admin' },
      { secret: 'secreto-del-atacante' },
    );
    expect(await resultado(middleware, crearReq('/api/v1/admin', token))).toBe(UNAUTHORIZED);
  });

  it('rechaza un token EXPIRADO', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(
      jwt,
      { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' },
      { expiresIn: -10 },
    );
    expect(await resultado(middleware, crearReq('/api/v1/assets', token))).toBe(UNAUTHORIZED);
  });

  it('acepta un token valido y llama a next()', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    const next = await correr(middleware, crearReq('/api/v1/assets', token));
    expect(next).toHaveBeenCalled();
  });
});

describe('AuthMiddleware - inyeccion de identidad hacia los servicios', () => {
  it('inyecta x-user-id / x-user-email / x-user-role desde el JWT', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, {
      sub: 'user-42',
      email: 'titular@ejemplo.com',
      role: 'asset_owner',
    });
    const req = crearReq('/api/v1/assets', token);
    await correr(middleware, req);
    expect(req.headers['x-user-id']).toBe('user-42');
    expect(req.headers['x-user-email']).toBe('titular@ejemplo.com');
    expect(req.headers['x-user-role']).toBe('asset_owner');
  });

  /**
   * CRITICO. Los servicios confian ciegamente en x-user-*. Si un cliente
   * pudiera mandarlos y el gateway no los pisara, cualquiera con un token
   * valido propio se haria pasar por admin ante todos los microservicios.
   */
  it('PISA los headers x-user-* que venga falseando el cliente', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, {
      sub: 'user-real',
      email: 'real@ejemplo.com',
      role: 'entrepreneur',
    });
    const req = crearReq('/api/v1/assets', token, {
      'x-user-id': 'admin-falseado',
      'x-user-role': 'admin',
      'x-user-email': 'falso@ejemplo.com',
    });
    await correr(middleware, req);
    expect(req.headers['x-user-id']).toBe('user-real');
    expect(req.headers['x-user-role']).toBe('entrepreneur');
    expect(req.headers['x-user-email']).toBe('real@ejemplo.com');
  });
});

describe('AuthMiddleware - rutas de admin', () => {
  /**
   * REGRESION DE BYPASS DE AUTENTICACION.
   * Mientras el chequeo comparaba contra `req.path`, dentro de un middleware
   * montado ese valor es '/' y NINGUNA ruta de admin matcheaba: cualquier
   * usuario logueado atravesaba el gateway hacia /api/v1/admin/*.
   * El fixture de arriba reproduce esa forma real (path '/', baseUrl completo).
   */
  it.each([
    '/api/v1/admin',
    '/api/v1/admin/assets',
    '/api/v1/admin/metrics',
    '/api/v1/admin/users/u1/suspend',
  ])('un entrepreneur NO atraviesa %s', async (url) => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq(url, token))).toBe(FORBIDDEN);
  });

  it('un asset_owner tampoco atraviesa /api/v1/admin', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'asset_owner' });
    expect(await resultado(middleware, crearReq('/api/v1/admin/metrics', token))).toBe(
      FORBIDDEN,
    );
  });

  it('un admin si atraviesa /api/v1/admin', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'admin' });
    expect(await resultado(middleware, crearReq('/api/v1/admin/metrics', token))).toBe('PASO');
  });

  it('el query string no esquiva el chequeo de admin', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/admin/metrics?x=1', token))).toBe(
      FORBIDDEN,
    );
  });

  it('la barra final no esquiva el chequeo de admin', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/admin/', token))).toBe(
      FORBIDDEN,
    );
  });

  it('una ruta que solo EMPIEZA parecido no se confunde con admin', async () => {
    // '/api/v1/administracion' no debe caer bajo el prefijo '/api/v1/admin'.
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/administracion', token))).toBe('PASO');
  });

  it('el 403 de admin no se degrada a 401 al pasar por el catch', async () => {
    // El middleware re-lanza el ForbiddenException a proposito. Sin eso, el
    // catch lo convertia en 401 y el frontend mostraba "sesion expirada" en
    // vez de "no tenes permiso".
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u1', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/admin', token))).toBe(FORBIDDEN);
  });
});

/**
 * El listado completo de usuarios es admin-only, pero los recursos del propio
 * usuario cuelgan del MISMO prefijo. Si el match fuera por prefijo, el dueno de
 * la cuenta recibiria 403 sobre sus propios datos (perfil, notificaciones,
 * wishlist) y se romperia media app en silencio.
 */
describe('AuthMiddleware - /api/v1/users: exacto es admin, subrecursos son del usuario', () => {
  it('el LISTADO /api/v1/users es admin-only', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u42', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/users', token))).toBe(
      FORBIDDEN,
    );
  });

  it('un admin si puede listar usuarios', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'a1', email: 'a@b.com', role: 'admin' });
    expect(await resultado(middleware, crearReq('/api/v1/users', token))).toBe('PASO');
  });

  it.each([
    ['/api/v1/users/u42/profile', 'editar el propio perfil'],
    ['/api/v1/users/u42/notifications', 'guardar preferencias de notificacion'],
    ['/api/v1/users/u42/saved', 'leer la wishlist propia'],
    ['/api/v1/users/u42/saved/asset-1', 'guardar un activo'],
  ])('un usuario comun SI atraviesa %s (%s)', async (url) => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u42', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq(url, token))).toBe('PASO');
  });

  it('el listado con barra final sigue siendo admin-only', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u42', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/users/', token))).toBe(
      FORBIDDEN,
    );
  });

  it('el listado con query string sigue siendo admin-only', async () => {
    const { middleware, jwt } = crearMiddleware();
    const token = firmar(jwt, { sub: 'u42', email: 'a@b.com', role: 'entrepreneur' });
    expect(await resultado(middleware, crearReq('/api/v1/users?page=1', token))).toBe(
      FORBIDDEN,
    );
  });
});
