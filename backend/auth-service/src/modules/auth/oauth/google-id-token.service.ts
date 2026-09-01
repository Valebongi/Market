import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { GoogleJwksService } from './google-jwks.service';

/**
 * Verificacion del ID token de Google (el `credential` que entrega Google
 * Identity Services).
 *
 * QUE ARREGLA
 * Antes, `POST /auth/oauth/callback` recibia `email` y `providerId` como campos
 * sueltos: el frontend decodificaba el JWT de Google en el navegador y mandaba
 * los claims. Decodificar no es verificar. Cualquiera que llegara al endpoint
 * podia mandar el email de otro y llevarse un accessToken valido para esa
 * cuenta. Ahora llega el token ENTERO y la identidad sale de un token cuya
 * firma verificamos nosotros: los claims dejan de ser input del cliente y pasan
 * a ser output de la verificacion.
 *
 * POR QUE NO HACE FALTA EL client_secret
 * Verificar un ID token es criptografia de clave publica: se necesita la clave
 * publica de Google (JWKS) y nuestro Client ID como audiencia esperada. El
 * client_secret solo aparece en el flujo de intercambio de `code` (server-side
 * authorization code), que no es este. Si algun dia este archivo necesita el
 * secreto, es senial de que el diseño se fue a otro flujo.
 *
 * LOS CINCO CHEQUEOS
 * Los cinco son necesarios; sacar cualquiera convierte esto en teatro:
 *   1. alg     - allowlist estricta RS256. Cierra `alg: none` y la confusion
 *                RS256/HS256 (ver ALGORITMO, abajo).
 *   2. firma   - contra la clave publica de Google identificada por `kid`.
 *   3. iss     - el token lo emitio Google y no otro OP.
 *   4. aud     - el token fue emitido PARA NOSOTROS. Es el chequeo que mas se
 *                olvida: sin el, un ID token perfectamente valido emitido por
 *                Google para CUALQUIER otra aplicacion pasa la verificacion.
 *                Como cualquiera puede crear un proyecto en Google Cloud y
 *                lograr que su propio sitio reciba un ID token de la victima,
 *                omitir `aud` es toma de cuenta universal con firma valida.
 *   5. exp     - el token no vencio.
 * Mas `email_verified`: sin el, alguien registra `victima@gmail.com` como email
 * no verificado en su propio proveedor y hereda la cuenta por el linkeo por
 * email de `oauthLogin`.
 *
 * ALGORITMO (por que esto no es un JWT hecho a mano de los que salen mal)
 * Los dos errores clasicos de verificar JWTs a mano son aceptar `alg: none` y
 * la confusion RS256/HS256 (pasarle la clave publica RSA como si fuera el
 * secreto HMAC). Aca los dos son imposibles por construccion, no por
 * disciplina:
 *   - `alg` se compara contra una allowlist de un solo valor ANTES de tocar
 *     nada, asi que `none` no llega a la verificacion.
 *   - la verificacion usa `crypto.verify` con un KeyObject asimetrico RSA. Esa
 *     API no puede calcular un HMAC: no existe el camino de codigo donde la
 *     clave publica se use como secreto simetrico. La confusion RS256/HS256
 *     necesita una API polimorfica que elija el algoritmo mirando el header del
 *     token; aca el algoritmo esta fijo en el codigo y la clave es un objeto
 *     tipado.
 */

/** Los dos `iss` que usa Google. Ambos son canonicos y ambos aparecen en la practica. */
const VALID_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

/** Allowlist de algoritmos. Google firma ID tokens con RS256 y solo con RS256. */
const ALLOWED_ALG = 'RS256';

/** Tolerancia de reloj entre nuestro server y Google. */
const CLOCK_SKEW_SECONDS = 60;

/** Un ID token de Google pesa ~1 KB. El tope corta el parseo de basura grande. */
const MAX_TOKEN_BYTES = 8 * 1024;

/** base64url estricto. Evita las diferencias de parseo del decoder laxo de Node. */
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

/** Identidad que sale de un token verificado. Nada de esto lo eligio el cliente. */
export interface VerifiedGoogleIdentity {
  /** Claim `sub`: identificador estable del usuario en Google. */
  providerId: string;
  email: string;
  /** Claim `name`, o la parte local del email si Google no lo mando. */
  name: string;
}

interface JwtHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

interface GoogleIdTokenClaims {
  iss?: unknown;
  aud?: unknown;
  azp?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  nbf?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

@Injectable()
export class GoogleIdTokenService {
  private readonly logger = new Logger('auth:google-oauth');

  constructor(
    private readonly config: ConfigService,
    private readonly jwks: GoogleJwksService,
  ) {}

  /**
   * Verifica el `credential` y devuelve la identidad. Tira siempre que el token
   * no sea plenamente confiable.
   *
   * Al cliente le vuelve un mensaje generico: cual de los chequeos fallo es
   * informacion util para quien esta probando ataques y no para el usuario. El
   * motivo preciso va al log, que es donde lo necesita el operador (y es
   * especialmente explicito para el desajuste de `aud`, que es la
   * misconfiguracion numero uno al conectar Google Cloud).
   */
  async verify(credential: string): Promise<VerifiedGoogleIdentity> {
    const clientId = this.getClientId();

    if (typeof credential !== 'string' || Buffer.byteLength(credential) > MAX_TOKEN_BYTES) {
      throw this.reject('el credential no es un string de tamanio razonable');
    }

    // ---- 1. Estructura -----------------------------------------------------
    const parts = credential.split('.');
    if (parts.length !== 3 || parts.some((p) => !p || !BASE64URL_RE.test(p))) {
      throw this.reject('el credential no tiene la forma de un JWS compacto');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    // ---- 2. Header y allowlist de algoritmo --------------------------------
    // Esto va ANTES de cualquier otra cosa: es lo que cierra `alg: none`.
    const header = this.decodeJson<JwtHeader>(headerB64, 'header');

    if (header.alg !== ALLOWED_ALG) {
      throw this.reject(`alg no permitido: ${String(header.alg)} (solo se acepta ${ALLOWED_ALG})`);
    }
    if (header.typ !== undefined && header.typ !== 'JWT') {
      throw this.reject(`typ inesperado: ${String(header.typ)}`);
    }
    if (typeof header.kid !== 'string' || !header.kid) {
      throw this.reject('el header no trae kid');
    }

    // ---- 3. Firma ----------------------------------------------------------
    const key = await this.resolveKey(header.kid);
    if (!key) {
      throw this.reject(`ninguna clave publica de Google matchea el kid ${header.kid}`);
    }

    const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'ascii');
    const signature = Buffer.from(signatureB64, 'base64url');

    // `crypto.verify` con un KeyObject RSA: no hay forma de que esto degrade a
    // HMAC ni de que el `alg` del token influya en el algoritmo usado.
    const signatureOk = crypto.verify(
      'RSA-SHA256',
      signingInput,
      { key, padding: crypto.constants.RSA_PKCS1_PADDING },
      signature,
    );

    if (!signatureOk) {
      throw this.reject(`firma invalida para el kid ${header.kid}`);
    }

    // A partir de aca los claims son confiables: los firmo Google.
    const claims = this.decodeJson<GoogleIdTokenClaims>(payloadB64, 'payload');

    // ---- 4. iss ------------------------------------------------------------
    if (typeof claims.iss !== 'string' || !VALID_ISSUERS.has(claims.iss)) {
      throw this.reject(`iss invalido: ${String(claims.iss)}`);
    }

    // ---- 5. aud ------------------------------------------------------------
    this.assertAudience(claims, clientId);

    // ---- 6. Tiempos --------------------------------------------------------
    const now = Math.floor(Date.now() / 1000);

    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
      throw this.reject('exp ausente o no numerico');
    }
    if (now > claims.exp + CLOCK_SKEW_SECONDS) {
      throw this.reject(`token expirado (exp=${claims.exp}, now=${now})`);
    }
    if (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat)) {
      throw this.reject('iat ausente o no numerico');
    }
    if (claims.iat > now + CLOCK_SKEW_SECONDS) {
      throw this.reject(`token emitido en el futuro (iat=${claims.iat}, now=${now})`);
    }
    if (typeof claims.nbf === 'number' && now + CLOCK_SKEW_SECONDS < claims.nbf) {
      throw this.reject(`token todavia no valido (nbf=${claims.nbf}, now=${now})`);
    }

    // ---- 7. Identidad ------------------------------------------------------
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) {
      throw this.reject('sub ausente o invalido');
    }
    if (typeof claims.email !== 'string' || !claims.email.includes('@') || claims.email.length > 320) {
      throw this.reject('email ausente o invalido');
    }

    // Google manda booleano; se acepta tambien la forma string porque algunos
    // OPs la usan y es barato ser tolerante en la FORMA sin serlo en el VALOR.
    // Lo que no se acepta es que el claim falte: eso es "no verificado".
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    if (!emailVerified) {
      throw this.reject(`email sin verificar en Google (${claims.email})`);
    }

    const name =
      typeof claims.name === 'string' && claims.name.trim()
        ? claims.name.trim().slice(0, 120)
        : claims.email.split('@')[0];

    return { providerId: claims.sub, email: claims.email, name };
  }

  /**
   * El Client ID sale de la variable de entorno GOOGLE_CLIENT_ID y tiene que
   * ser el MISMO valor que NEXT_PUBLIC_GOOGLE_CLIENT_ID del frontend.
   *
   * Sin el configurado NO se degrada a "verificar sin audiencia": eso seria
   * exactamente la vulnerabilidad descrita arriba, aceptando tokens emitidos
   * para cualquier aplicacion. Falla cerrado con 503 (problema de
   * configuracion del servidor, no credencial invalida del usuario).
   */
  private getClientId(): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();

    if (!clientId) {
      this.logger.error(
        'GOOGLE_CLIENT_ID no esta configurado en auth-service. El login con Google queda ' +
          'deshabilitado: sin Client ID no se puede validar la audiencia del ID token, y ' +
          'validar sin audiencia equivale a no validar. Configura la variable con el mismo ' +
          'valor que NEXT_PUBLIC_GOOGLE_CLIENT_ID del frontend.',
      );
      throw new ServiceUnavailableException('Login con Google no disponible');
    }

    return clientId;
  }

  /**
   * El `aud` de un ID token de Google es un string, pero el RFC permite un
   * array; se soportan las dos formas. Con multiples audiencias, el RFC pide
   * que `azp` identifique a la parte autorizada, asi que se exige que sea la
   * nuestra: sin eso, aparecer en una lista junto a otras aplicaciones
   * alcanzaria para pasar.
   */
  private assertAudience(claims: GoogleIdTokenClaims, clientId: string): void {
    const audiences =
      typeof claims.aud === 'string'
        ? [claims.aud]
        : Array.isArray(claims.aud)
          ? claims.aud.filter((a): a is string => typeof a === 'string')
          : [];

    if (!audiences.includes(clientId)) {
      // Este log es deliberadamente explicito: es el error que se comete al
      // conectar Google Cloud y, sin decir los dos valores, es indistinguible
      // de "el token es invalido".
      this.logger.warn(
        `ID token rechazado por audiencia: aud=${JSON.stringify(claims.aud)} pero ` +
          `GOOGLE_CLIENT_ID=${clientId}. Si el login te falla siempre, es que el Client ID ` +
          `de auth-service no coincide con el que usa el frontend en Google Identity Services.`,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (audiences.length > 1 && claims.azp !== clientId) {
      throw this.reject(`aud multiple sin azp propio (azp=${String(claims.azp)})`);
    }
  }

  /**
   * Traduce la falla de obtener claves: si Google no responde y no hay cache,
   * es indisponibilidad nuestra (503), no una credencial invalida del usuario.
   * Devolver 401 ahi mandaria al usuario a revisar su cuenta de Google por un
   * problema que no es suyo.
   */
  private async resolveKey(kid: string): Promise<crypto.KeyObject | null> {
    try {
      return await this.jwks.getKey(kid);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo verificar el token de Google en este momento. Intenta de nuevo.',
      );
    }
  }

  private decodeJson<T>(segment: string, label: string): T {
    try {
      const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('no es un objeto JSON');
      }
      return parsed as T;
    } catch {
      throw this.reject(`el ${label} del token no es JSON valido`);
    }
  }

  /** Motivo preciso al log, mensaje generico al cliente. */
  private reject(reason: string): UnauthorizedException {
    this.logger.warn(`ID token de Google rechazado: ${reason}`);
    return new UnauthorizedException('Credenciales invalidas');
  }
}
