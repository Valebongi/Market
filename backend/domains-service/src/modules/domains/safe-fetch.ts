import { Logger } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const logger = new Logger('SafeFetch');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SSRF: por qué existe este archivo
 * ═══════════════════════════════════════════════════════════════════════════
 * domains-service es el ÚNICO servicio del sistema que hace peticiones
 * salientes, así que es toda la superficie de SSRF que tenemos. Y la parte
 * peligrosa no es la URL que armamos nosotros —esa está sanitizada— sino la
 * que arma un tercero: `rdap.org` es un REDIRECTOR. Nos manda un 302 al
 * servidor RDAP autoritativo del TLD, y ESE Location es una URL que no
 * controlamos.
 *
 * `fetch()` de Node sigue redirecciones por default (hasta 20 saltos) sin
 * mirar a dónde. Verificado con un PoC local que replica exactamente la
 * llamada de `rdap.ts::fetchAvailability`:
 *
 *   registro RDAP hostil responde:  302 Location: http://127.0.0.1:<port>/
 *   -> fetch siguió el salto solo
 *   -> el servidor interno recibió el request (accept: application/rdap+json)
 *   -> response.status 200, response.url 127.0.0.1, body del servicio interno
 *
 * O sea: cualquiera que opere el RDAP de un TLD —y el cliente elige el TLD,
 * `extensions` es input del usuario— podía apuntarnos a `localhost:3001`
 * (auth-service), a `169.254.169.254` (metadata de la nube) o a
 * `*.railway.internal`. Blind SSRF: el status de la respuesta interna vuelve
 * al usuario traducido a `available` / `registered` / `unknown`, que alcanza
 * para barrer puertos internos.
 *
 * Peor todavía: un `404` de un host interno con `redirected === true` se
 * traducía a `available: true` CON link de afiliación. El atacante no sólo
 * escanea: envenena la respuesta de disponibilidad.
 *
 * ── La defensa ─────────────────────────────────────────────────────────────
 * `redirect: 'manual'` y seguimos los saltos a mano, validando CADA hop:
 *   1. el esquema tiene que ser http/https (nada de file:, gopher:, data:);
 *   2. el host no puede ser un nombre interno (`.internal`, `.local`, sin
 *      punto);
 *   3. el host se resuelve por DNS y NINGUNA de sus direcciones puede caer en
 *      rango privado / loopback / link-local / CGNAT / ULA / multicast.
 *
 * Un hop rechazado NO revienta el request: devuelve error y el llamador cae en
 * `unknown` -> `available: false`, que es el lado seguro que ya exige la regla
 * del servicio.
 *
 * ── Lo que esto NO cubre (reportado, requiere aprobación) ──────────────────
 * DNS rebinding. Validamos la resolución y después `fetch` vuelve a resolver
 * por su cuenta: entre las dos resoluciones hay una ventana TOCTOU. Cerrarla
 * de verdad pide pinnear la IP validada en el connect (dispatcher de `undici`
 * con `connect.lookup`, o reescribir esta capa sobre `node:https`), y las dos
 * cosas son dependencia nueva o reescritura del transporte en un servicio en
 * producción. La validación por hop ya corta el ataque realista —el atacante
 * controla el header `Location`, no nuestro resolver—; el rebinding queda como
 * escalada exótica pendiente.
 */

/** Saltos máximos. rdap.org usa 1 (bootstrap -> registro). 3 da margen. */
const MAX_REDIRECTS = 3;

/**
 * Sufijos de host que jamás son un registro RDAP público y sí son la red
 * interna. `railway.internal` es el service discovery de nuestro propio PaaS.
 */
const BLOCKED_HOST_SUFFIXES = [
  '.internal',
  '.local',
  '.localhost',
  '.localdomain',
  '.home.arpa',
];

const BLOCKED_HOSTNAMES = ['localhost', 'metadata.google.internal'];

function ipv4ToParts(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

/**
 * Rangos IPv4 que no son internet público. La lista es explícita a propósito:
 * un `!isPublic` implícito se equivoca en silencio.
 */
function isBlockedIpv4(ip: string): boolean {
  const p = ipv4ToParts(ip);
  if (!p) return true; // no lo entendemos -> no lo dejamos pasar
  const [a, b] = p;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10/8 privada
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 privada
  if (a === 192 && b === 168) return true; // 192.168/16 privada
  if (a === 192 && b === 0) return true; // 192.0.0/24 IETF + 192.0.2/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast, reservado y 255.255.255.255

  return false;
}

function isBlockedIpv6(raw: string): boolean {
  const ip = raw.toLowerCase().split('%')[0]; // saca el scope id (fe80::1%eth0)

  if (ip === '::' || ip === '::1') return true; // unspecified / loopback

  // IPv4 embebida: ::ffff:127.0.0.1 y ::ffff:7f00:1 son la MISMA dirección.
  // Sin este desvío, `::ffff:169.254.169.254` esquivaba toda la lista IPv4.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  if (ip.startsWith('::ffff:') || ip.startsWith('::')) return true;

  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 unique-local
  if (ip.startsWith('ff')) return true; // ff00::/8 multicast

  return false;
}

/** `true` si la IP NO es internet público. Exportada para los tests. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // ni IPv4 ni IPv6 -> no sabemos qué es -> se bloquea
}

export class BlockedTargetError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'BlockedTargetError';
  }
}

/**
 * Valida una URL de destino. Tira `BlockedTargetError` si apunta a algo que no
 * es internet público.
 */
export async function assertPublicTarget(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BlockedTargetError(`esquema no permitido: ${url.protocol}`);
  }

  // `URL` deja el host IPv6 entre corchetes: [::1] -> ::1
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (!host) throw new BlockedTargetError('host vacío');
  if (BLOCKED_HOSTNAMES.includes(host)) {
    throw new BlockedTargetError(`host interno: ${host}`);
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new BlockedTargetError(`host interno: ${host}`);
  }
  // Un host sin punto no es un FQDN público: es un nombre de service discovery
  // (`auth-service`, `postgres`, `redis`) resoluble sólo adentro de la red.
  if (!host.includes('.') && isIP(host) === 0) {
    throw new BlockedTargetError(`host sin dominio, probable nombre interno: ${host}`);
  }

  // IP literal: se valida directo, sin DNS.
  if (isIP(host) !== 0) {
    if (isBlockedAddress(host)) {
      throw new BlockedTargetError(`IP no pública: ${host}`);
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await dnsLookup(host, { all: true });
  } catch (error) {
    throw new BlockedTargetError(
      `no se pudo resolver ${host}: ${error instanceof Error ? error.message : 'error de DNS'}`,
    );
  }

  if (addresses.length === 0) {
    throw new BlockedTargetError(`${host} no resolvió a ninguna dirección`);
  }

  // TODAS tienen que ser públicas. Con `some` alcanzaba con publicar un
  // registro público al lado de uno privado para pasar el control.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new BlockedTargetError(`${host} resuelve a una dirección no pública (${address})`);
    }
  }
}

export interface SafeFetchResult {
  response: Response;
  /** Hubo al menos un salto. Reemplaza a `response.redirected`, que con
   *  `redirect: 'manual'` siempre es `false`. */
  redirected: boolean;
}

/**
 * `fetch` con redirecciones seguidas A MANO y validadas hop por hop.
 *
 * El `signal` del llamador cubre TODA la cadena, no cada salto: el
 * presupuesto de latencia sigue siendo el mismo de antes.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { signal?: AbortSignal },
): Promise<SafeFetchResult> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new BlockedTargetError(`URL inválida: ${rawUrl}`);
  }

  let redirected = false;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicTarget(current);

    const response = await fetch(current, { ...init, redirect: 'manual' });

    const location = response.headers.get('location');
    const isRedirect = response.status >= 300 && response.status < 400 && location;

    if (!isRedirect) {
      return { response, redirected };
    }

    // El body del 3xx no le importa a nadie, pero sin cancelarlo el socket
    // queda colgado del pool de undici hasta el timeout.
    void response.body?.cancel().catch(() => undefined);

    let next: URL;
    try {
      next = new URL(location, current); // `location` puede ser relativo
    } catch {
      throw new BlockedTargetError(`Location inválido: ${location}`);
    }

    if (next.protocol === 'http:' && current.protocol === 'https:') {
      // No se corta: un host público en texto plano no es SSRF. Pero que un
      // registro RDAP degrade a http es raro y vale saberlo.
      logger.warn(`Redirección de https a http: ${current.host} -> ${next.host}`);
    }

    current = next;
    redirected = true;
  }

  throw new BlockedTargetError(`más de ${MAX_REDIRECTS} redirecciones`);
}

/**
 * Lee el body como JSON con TECHO DE BYTES.
 *
 * `response.json()` bufferea lo que venga: si el endpoint externo (o algo en
 * el medio) devuelve un payload gigante, el servicio se come esa memoria
 * entera. La tabla de Porkbun mide ~82 KB reales; el tope está holgado pero
 * acotado.
 *
 * Se lee el stream de a chunks y se corta apenas se pasa: no se llega a
 * materializar el payload completo en memoria.
 */
export async function readJsonCapped(response: Response, maxBytes: number): Promise<unknown> {
  const body = response.body;
  if (!body) throw new Error('respuesta sin body');

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > maxBytes) {
        throw new Error(`respuesta supera el techo de ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    void body.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(merged));
}
