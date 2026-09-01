import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Cache de las claves publicas con las que Google firma sus ID tokens.
 *
 * POR QUE ES UN SERVICIO APARTE
 * Verificar la firma es puro CPU y no falla nunca por causas externas.
 * Conseguir la clave con la que verificar SI: sale por red, contra un tercero,
 * y las claves ROTAN (Google publica 3-4 a la vez y las va reemplazando cada
 * pocos dias). Casi todo lo que puede salir mal en esta feature vive aca, no en
 * el verificador. Por eso esta separado y por eso este archivo tiene mas
 * comentarios que codigo.
 *
 * DESCUBRIMIENTO
 * El jwks_uri NO esta hardcodeado: sale del documento de discovery OIDC de
 * Google, que es el mecanismo que existe justamente para que Google pueda mover
 * sus claves de lugar sin coordinar con nosotros. Pero el host resultante se
 * valida contra una allowlist (ALLOWED_JWKS_HOSTS): si algun dia ese documento
 * devolviera una URL de otro dominio, estariamos aceptando claves de quien sea,
 * o sea que la verificacion entera pasaria a ser decorativa. La allowlist es lo
 * que hace que el descubrimiento no sea un canal de inyeccion de claves. Si el
 * discovery no responde o devuelve algo raro, se cae a FALLBACK_JWKS_URI, que
 * es la URL que Google publica hace anios.
 *
 * QUE PASA SI GOOGLE NO RESPONDE  (stale-if-error)
 * Si el refresco falla pero tenemos claves cacheadas, se SIGUE usando el cache
 * viejo y se loguea un warning. Es deliberado: las claves de Google no dejan de
 * ser validas porque el endpoint este caido un rato, y tirar abajo el login de
 * todo el mundo por una intermitencia de red del proveedor es peor que
 * verificar contra una clave de hace unas horas. Lo unico que se pierde es la
 * capacidad de validar tokens firmados con una clave NUEVA, y esos fallan
 * cerrado (401), no abierto. Solo si no hay NINGUNA clave (arranque en frio +
 * Google caido) el verificador corta con 503, que es un fallo de
 * disponibilidad honesto y no un "credenciales invalidas" mentiroso.
 *
 * ROTACION
 * Un kid que no esta en el cache dispara un refresco forzado, porque es la
 * senial de que Google roto claves antes de que venciera nuestro TTL. Ese
 * refresco tiene un cooldown (FORCED_REFRESH_COOLDOWN_MS): sin el, mandar
 * tokens con kid aleatorios seria una forma gratuita de hacernos martillar a
 * Google desde afuera (y de que Google nos limite, rompiendo el login de
 * verdad).
 */

/** Documento de discovery OIDC de Google. */
const DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';

/** Donde Google publica sus claves desde siempre. Red de contencion del discovery. */
const FALLBACK_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

/**
 * Hosts de los que aceptamos bajar claves. Sin esto, el discovery seria un
 * canal por el cual una respuesta manipulada nos hace confiar en claves ajenas.
 */
const ALLOWED_JWKS_HOSTS = new Set(['www.googleapis.com', 'accounts.google.com']);

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Limites del TTL. Google manda Cache-Control: max-age=... (tipicamente entre
 * 1 y 24 horas) y lo respetamos, pero acotado: un max-age absurdamente corto
 * nos haria pegarle en cada login, y uno absurdamente largo nos dejaria sin ver
 * una rotacion durante dias.
 */
const MIN_TTL_MS = 5 * 60_000;
const MAX_TTL_MS = 24 * 60 * 60_000;
const DEFAULT_TTL_MS = 60 * 60_000;

/** Un kid desconocido no puede disparar mas de un fetch por minuto. */
const FORCED_REFRESH_COOLDOWN_MS = 60_000;

/** El JWKS de Google pesa ~2 KB. Cualquier cosa mas grande no es el JWKS. */
const MAX_RESPONSE_BYTES = 128 * 1024;

interface JsonWebKeyEntry {
  kty?: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
}

@Injectable()
export class GoogleJwksService {
  private readonly logger = new Logger('auth:google-jwks');

  /**
   * kid -> clave publica ya importada. Se importa al cachear, no al verificar,
   * para que una clave malformada explote en el refresco y no en un login.
   */
  private keys = new Map<string, crypto.KeyObject>();

  /** Momento en que vence el cache. 0 = nunca se cargo. */
  private expiresAt = 0;

  /** Ultima carga exitosa; solo para el log de stale-if-error. */
  private lastSuccessAt = 0;

  /** Ultimo intento de refresco forzado por kid desconocido (cooldown). */
  private lastForcedRefreshAt = 0;

  /** jwks_uri resuelto por discovery. Se resuelve una vez por proceso. */
  private jwksUri: string | null = null;

  /**
   * Refresco en vuelo. Sin esto, 50 logins simultaneos con el cache vencido
   * disparan 50 fetches a Google en paralelo.
   */
  private inFlight: Promise<void> | null = null;

  /**
   * Devuelve la clave publica para un kid, refrescando si hace falta.
   *   null = no hay clave para ese kid -> token invalido (401).
   *   tira = no hay forma de conseguir claves -> indisponibilidad (503).
   */
  async getKey(kid: string): Promise<crypto.KeyObject | null> {
    if (Date.now() >= this.expiresAt) {
      await this.refresh();
    }

    const hit = this.keys.get(kid);
    if (hit) return hit;

    // Cache vigente pero sin ese kid: probablemente Google roto antes de que
    // venciera nuestro TTL. Un solo reintento, con cooldown.
    if (Date.now() - this.lastForcedRefreshAt >= FORCED_REFRESH_COOLDOWN_MS) {
      this.lastForcedRefreshAt = Date.now();
      this.logger.log(`kid desconocido (${kid}); refrescando JWKS por posible rotacion`);
      await this.refresh();
      return this.keys.get(kid) ?? null;
    }

    return null;
  }

  /** Refresco coalescido: todos los llamadores concurrentes comparten un fetch. */
  private async refresh(): Promise<void> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.doRefresh().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async doRefresh(): Promise<void> {
    try {
      const uri = await this.resolveJwksUri();
      const { keys, ttlMs } = await this.fetchJwks(uri);

      if (keys.size === 0) {
        throw new Error('el JWKS no traia ninguna clave RSA de firma utilizable');
      }

      this.keys = keys;
      this.expiresAt = Date.now() + ttlMs;
      this.lastSuccessAt = Date.now();
      this.logger.log(
        `JWKS actualizado: ${keys.size} clave(s), proximo refresco en ${Math.round(ttlMs / 1000)}s`,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'error desconocido';

      // stale-if-error: si hay claves viejas se siguen usando. Ver cabecera.
      if (this.keys.size > 0) {
        const ageMin = Math.round((Date.now() - this.lastSuccessAt) / 60_000);
        this.logger.warn(
          `no se pudo refrescar el JWKS de Google (${reason}). ` +
            `Se sigue usando el cache de hace ${ageMin} min con ${this.keys.size} clave(s): ` +
            `los tokens firmados con esas claves se validan normal, los firmados con una ` +
            `clave nueva se rechazan hasta que Google vuelva.`,
        );
        // Reintentar pronto, pero no en cada request.
        this.expiresAt = Date.now() + MIN_TTL_MS;
        return;
      }

      this.logger.error(
        `no se pudo obtener el JWKS de Google y no hay cache previo (${reason}). ` +
          `El login con Google queda no disponible (503) hasta que se pueda bajar las claves.`,
      );
      throw err;
    }
  }

  /**
   * Resuelve el jwks_uri por discovery, validando el host. Se cachea para todo
   * el proceso: es la parte mas estable del flujo y no vale la pena pagarle un
   * round-trip a cada rotacion de claves.
   */
  private async resolveJwksUri(): Promise<string> {
    if (this.jwksUri) return this.jwksUri;

    try {
      const res = await fetch(DISCOVERY_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const doc = (await res.json()) as { jwks_uri?: unknown };
      const uri = typeof doc.jwks_uri === 'string' ? doc.jwks_uri : '';
      const parsed = new URL(uri);

      // La allowlist es lo que impide que una respuesta de discovery manipulada
      // nos haga confiar en claves de otro dominio.
      if (parsed.protocol !== 'https:' || !ALLOWED_JWKS_HOSTS.has(parsed.hostname)) {
        throw new Error(`jwks_uri fuera de la allowlist: ${uri}`);
      }

      this.jwksUri = parsed.toString();
      return this.jwksUri;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'error desconocido';
      this.logger.warn(
        `discovery OIDC de Google no utilizable (${reason}); se usa el jwks_uri conocido`,
      );
      this.jwksUri = FALLBACK_JWKS_URI;
      return this.jwksUri;
    }
  }

  private async fetchJwks(
    uri: string,
  ): Promise<{ keys: Map<string, crypto.KeyObject>; ttlMs: number }> {
    const res = await fetch(uri, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status} al bajar el JWKS`);

    const body = await res.text();
    if (body.length > MAX_RESPONSE_BYTES) {
      throw new Error('la respuesta del JWKS excede el tamanio razonable');
    }

    const parsed = JSON.parse(body) as { keys?: unknown };
    if (!Array.isArray(parsed.keys)) {
      throw new Error('el JWKS no tiene un array `keys`');
    }

    const keys = new Map<string, crypto.KeyObject>();

    for (const jwk of parsed.keys as JsonWebKeyEntry[]) {
      // Se filtra ANTES de importar: solo claves RSA de firma declaradas RS256.
      // Una clave simetrica o EC colada en el set no debe poder terminar
      // usandose para validar un RS256.
      if (!jwk || jwk.kty !== 'RSA') continue;
      if (jwk.use && jwk.use !== 'sig') continue;
      if (jwk.alg && jwk.alg !== 'RS256') continue;
      if (typeof jwk.kid !== 'string' || !jwk.kid) continue;
      if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') continue;

      try {
        const key = crypto.createPublicKey({
          key: { kty: 'RSA', n: jwk.n, e: jwk.e } as crypto.JsonWebKeyInput['key'],
          format: 'jwk',
        });

        // Cinturon y tiradores: createPublicKey ya rechaza lo que no sea RSA
        // desde un JWK con kty RSA, pero el verificador asume RSA sin volver a
        // mirar, asi que la invariante se afirma aca.
        if (key.asymmetricKeyType !== 'rsa') continue;

        keys.set(jwk.kid, key);
      } catch {
        // Una clave ilegible no invalida el resto del set.
        this.logger.warn(`clave del JWKS descartada por ilegible (kid=${jwk.kid})`);
      }
    }

    return { keys, ttlMs: this.parseMaxAge(res.headers.get('cache-control')) };
  }

  /** Respeta el max-age que manda Google, acotado a [MIN_TTL, MAX_TTL]. */
  private parseMaxAge(cacheControl: string | null): number {
    const match = /max-age\s*=\s*(\d+)/i.exec(cacheControl ?? '');
    if (!match) return DEFAULT_TTL_MS;

    const ms = Number(match[1]) * 1000;
    if (!Number.isFinite(ms) || ms <= 0) return DEFAULT_TTL_MS;

    return Math.min(Math.max(ms, MIN_TTL_MS), MAX_TTL_MS);
  }
}
