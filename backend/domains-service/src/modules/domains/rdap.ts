import { Logger } from '@nestjs/common';
import { BlockedTargetError, safeFetch } from './safe-fetch';

const logger = new Logger('Rdap');

/**
 * 5s, no 3s. Medido contra rdap.org desde una conexión doméstica:
 *
 *   google.com  -> 2.54s  (302 a rdap.verisign.com + consulta)
 *   web.dev     -> ~1.0s
 *
 * O sea que el peor caso observado ya consumía el 84% de un presupuesto de 3s,
 * y son DOS saltos de red (bootstrap + servidor autoritativo). Un timeout que
 * se dispara no rompe nada —cae en `available: false`— pero le esconde al
 * usuario un dominio que SÍ podía comprar, y ese click es la vía de
 * monetización. Se prefiere esperar 2s más antes que perder el link.
 */
export const RDAP_TIMEOUT_MS = 5000;

/**
 * Cuántas consultas RDAP salen EN PARALELO, sumando el nombre exacto y las
 * sugerencias. rdap.org es un servicio público gratuito sin contrato: si nos
 * rate-limitea (429) todos los resultados caen en `unknown` -> `available:
 * false`, y la feature entera deja de mostrar links. O sea que pasarse de
 * rosca no degrada, apaga.
 *
 * Antes de este archivo el código hacía `Promise.all` sobre las extensiones:
 * hasta 10 requests simultáneas de un solo click, y el tope venía sólo del
 * `@ArrayMaxSize(10)` del DTO. Con sugerencias encima eso escalaba a ~25.
 * Con la cola, N consultas salen de a 4 y el peor caso de latencia es
 * `ceil(N/4) * 5s`, acotado por RDAP_MAX_LOOKUPS.
 */
export const RDAP_CONCURRENCY = 4;

/**
 * Techo duro de consultas RDAP por búsqueda (exactos + sugerencias). Con
 * 10 extensiones pedidas quedan 8 para sugerencias.
 */
export const RDAP_MAX_LOOKUPS = 18;

/**
 * Reintentos por BÚSQUEDA (no por dominio). Ver `RetryBudget`: acota el peor
 * caso de latencia cuando rdap.org está degradado en general.
 */
export const RDAP_MAX_RETRIES = 4;

export type AvailabilityResult = 'available' | 'registered' | 'unknown';

/**
 * TTL por resultado. Asimétrico a propósito:
 *
 * - `available` vence RÁPIDO. Un "disponible" cacheado que ya no lo está es
 *   exactamente el falso positivo que la regla del servicio prohíbe: mandaría
 *   al usuario al carrito de un dominio con dueño. 10 min es suficiente para
 *   cubrir el patrón real (el usuario tipea, corrige, vuelve a buscar) sin
 *   sostener una afirmación vieja.
 * - `registered` puede vivir horas: los dominios no se liberan de un momento
 *   para el otro, y equivocarse hacia "no disponible" es el lado seguro.
 * - `unknown` se reintenta casi enseguida: suele ser un 429 o un timeout
 *   puntual, y cachearlo largo congelaría el error.
 */
const TTL_MS: Record<AvailabilityResult, number> = {
  available: 10 * 60 * 1000,
  registered: 6 * 60 * 60 * 1000,
  unknown: 60 * 1000,
};

const CACHE_MAX_ENTRIES = 5000;

type CacheEntry = { status: AvailabilityResult; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function readCache(domain: string): AvailabilityResult | null {
  const hit = cache.get(domain);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(domain);
    return null;
  }
  return hit.status;
}

function writeCache(domain: string, status: AvailabilityResult): void {
  // Map itera en orden de inserción: los primeros son los más viejos.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    for (const key of cache.keys()) {
      cache.delete(key);
      if (cache.size < CACHE_MAX_ENTRIES) break;
    }
  }
  cache.set(domain, { status, expiresAt: Date.now() + TTL_MS[status] });
}

/** Sólo para tests / diagnóstico. */
export function resetRdapCache(): void {
  cache.clear();
}

/**
 * Chequeo de disponibilidad vía RDAP público (sin auth). Placeholder: migrar a
 * una API paga (GoDaddy / Namecheap / Dynadot) es decisión de negocio.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Por qué NO alcanza con `status === 404`
 * ─────────────────────────────────────────────────────────────────────────────
 * rdap.org es un REDIRECTOR: resuelve el TLD contra el bootstrap de IANA y
 * manda un 302 al servidor RDAP autoritativo. Cuando el TLD no está en ese
 * bootstrap, rdap.org contesta 404 él mismo, sin redirigir. Los dos casos
 * llegaban como "404" y el código los trataba igual → falso positivo.
 *
 * Verificado contra el bootstrap oficial (https://data.iana.org/rdap/dns.json):
 *
 *   .com  -> https://rdap.verisign.com/com/v1/
 *   .app  -> https://pubapi.registry.google/rdap/
 *   .tech -> https://rdap.radix.host/rdap/
 *   .dev  -> https://pubapi.registry.google/rdap/
 *   .io   -> SIN SERVICIO RDAP EN EL BOOTSTRAP
 *   .co   -> SIN SERVICIO RDAP EN EL BOOTSTRAP
 *
 * Y contra rdap.org, con dominios registradísimos:
 *
 *   google.io  -> HTTP 404, 0 redirects   (¡registrado!)
 *   github.io  -> HTTP 404, 0 redirects   (¡registrado!)
 *   google.co  -> HTTP 404, 0 redirects   (¡registrado!)
 *   amazon.co  -> HTTP 404, 0 redirects   (¡registrado!)
 *   google.com -> HTTP 200, 1 redirect    (registrado, bien detectado)
 *   radix.tech -> HTTP 404, 1 redirect    (disponible de verdad)
 *
 * Es decir: `.io` y `.co` —2 de las 6 extensiones por defecto, y las dos más
 * deseables para un marketplace tech— se reportaban SIEMPRE como disponibles,
 * con link de afiliación de Namecheap incluido. Cada click en uno de esos links
 * llevaba al usuario a comprar un dominio que ya tenía dueño.
 *
 * El discriminante es el redirect, no el status:
 *
 *   404 CON redirect  -> el registro autoritativo dijo "no existe" -> disponible
 *   404 SIN redirect  -> rdap.org no conoce el TLD                 -> unknown
 *
 * Se usa `response.redirected` en vez de una lista fija de TLDs a propósito: si
 * mañana `.io` entra al bootstrap de IANA, rdap.org va a empezar a redirigir y
 * esto se arregla solo, sin tocar código.
 */
async function fetchAvailability(
  domain: string,
): Promise<{ status: AvailabilityResult; reason: string }> {
  try {
    // `safeFetch` y no `fetch`: rdap.org REDIRIGE, y ese Location lo elige el
    // operador del TLD, no nosotros. Ver el comentario largo de `safe-fetch.ts`
    // — el `fetch` pelado seguía el salto a `127.0.0.1` sin chistar.
    const { response, redirected } = await safeFetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      {
        headers: { accept: 'application/rdap+json' },
        signal: AbortSignal.timeout(RDAP_TIMEOUT_MS),
      },
    );

    // El body RDAP no se usa —sólo importa el status— pero hay que cancelarlo
    // o el socket queda tomado en el pool hasta que expire.
    void response.body?.cancel().catch(() => undefined);

    if (response.status === 404) {
      return redirected
        ? { status: 'available', reason: '404 con redirect' }
        : { status: 'unknown', reason: '404 sin redirect: TLD fuera del bootstrap de IANA' };
    }

    if (response.status === 200) {
      return { status: 'registered', reason: '200' };
    }

    // 429 (rate limit), 5xx del registro, cualquier otra cosa: no sabemos.
    return { status: 'unknown', reason: `HTTP ${response.status}` };
  } catch (error) {
    // Un destino bloqueado NO es un error de red: no se reintenta (el
    // `Location` hostil va a ser el mismo) y se loguea fuerte, porque significa
    // que un registro RDAP nos apuntó a la red interna.
    if (error instanceof BlockedTargetError) {
      logger.error(`RDAP para ${domain} apuntó a un destino bloqueado: ${error.message}`);
      return { status: 'unknown', reason: `destino bloqueado: ${error.message}` };
    }

    // Error de red o timeout.
    const message = error instanceof Error ? error.message : 'error desconocido';
    return { status: 'unknown', reason: `sin respuesta: ${message}` };
  }
}

export type LookupOutcome = {
  status: AvailabilityResult;
  cached: boolean;
  /** Por qué dio eso. Sólo tiene valor operativo cuando `status === 'unknown'`. */
  reason: string;
};

/**
 * Presupuesto de reintentos COMPARTIDO por toda una búsqueda. Se pasa por
 * referencia justamente para que sea compartido: si rdap.org está caído
 * entero, reintentar los 14 dominios duplicaría la latencia de la búsqueda
 * para no arreglar nada. Con el presupuesto, los primeros stalls se
 * reintentan y a partir de ahí se acepta el `unknown` y se sigue.
 */
export type RetryBudget = { left: number };

export function newRetryBudget(): RetryBudget {
  return { left: RDAP_MAX_RETRIES };
}

/**
 * ¿Vale la pena reintentar este `unknown`?
 *
 * Sólo cuando NO hubo respuesta (timeout o error de red). Medido contra
 * rdap.org desde esta conexión, cinco consultas seguidas a `.com`:
 *
 *   1.13s · 1.29s · 1.23s · 0.96s · sin respuesta a los 12s
 *
 * O sea: el caso normal son ~1.2s y la falla es un STALL esporádico, no
 * lentitud sistémica. Con ese perfil un reintento recupera la mayoría de los
 * stalls y casi no agrega carga, porque sólo se dispara cuando la primera
 * consulta no trajo nada.
 *
 * Lo que NO se reintenta, y por qué:
 *   - `404 sin redirect`: es permanente (el TLD no publica RDAP). Reintentar
 *     da lo mismo 100 veces.
 *   - `HTTP 429`: rdap.org nos está limitando. Reintentar al toque es
 *     exactamente lo que no hay que hacer.
 *   - `HTTP 5xx`: el registro contestó, mal, pero contestó.
 */
function isRetriable(reason: string): boolean {
  return reason.startsWith('sin respuesta');
}

export async function checkDomainAvailability(
  domain: string,
  budget?: RetryBudget,
): Promise<LookupOutcome> {
  const cached = readCache(domain);
  if (cached) return { status: cached, cached: true, reason: 'cache' };

  let { status, reason } = await fetchAvailability(domain);

  if (status === 'unknown' && isRetriable(reason) && budget && budget.left > 0) {
    budget.left -= 1;
    const retry = await fetchAvailability(domain);
    status = retry.status;
    reason = retry.status === 'unknown' ? `${retry.reason} (2 intentos)` : retry.reason;
  }

  writeCache(domain, status);
  return { status, cached: false, reason };
}

/**
 * Corre `fn` sobre `items` con a lo sumo `limit` promesas vivas a la vez,
 * preservando el orden del array de salida. Reemplaza al `Promise.all` que
 * disparaba todas las consultas RDAP de golpe.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * El motivo NO es decorativo. Los dos `unknown` que más aparecen piden acciones
 * opuestas y desde afuera se ven idénticos:
 *
 *   "404 sin redirect"  -> el TLD no publica RDAP (.io, .co, .me). Es
 *                          permanente y esperado: no hay nada que arreglar.
 *   "HTTP 429"          -> rdap.org nos está limitando. Es transitorio y SÍ
 *                          hay que actuar (bajar RDAP_CONCURRENCY o el tope de
 *                          sugerencias), porque mientras dura, dominios libres
 *                          se reportan como no disponibles y se pierden clicks.
 *
 * Sin el motivo en el log, un rate limit se ve igual que un `.io` cualquiera.
 */
export function logInconclusive(domain: string, reason: string): void {
  logger.warn(`RDAP no concluyente para ${domain} (${reason}); se reporta como no disponible`);
}
