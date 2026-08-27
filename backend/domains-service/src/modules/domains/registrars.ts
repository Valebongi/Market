import { Logger } from '@nestjs/common';
import type { TldPricing } from './pricing.service';

const logger = new Logger('Registrars');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Deep links: MEDIDOS con navegador real, no leídos de la documentación
 * ═══════════════════════════════════════════════════════════════════════════
 * Namecheap responde 403 a curl sin User-Agent de navegador, y encima la
 * página de resultados es una SPA: el HTML que baja es un cascarón y las filas
 * las pinta JavaScript. Por eso NADA de lo que sigue se verificó mirando el
 * HTML crudo. El método fue:
 *
 *   chrome --headless=new --user-agent="<UA de Chrome real>" \
 *          --virtual-time-budget=30000 --dump-dom "<url>"
 *
 * y después buscar el dominio en el TEXTO VISIBLE del DOM ya renderizado.
 * (Ojo: el UA por defecto de headless dice "HeadlessChrome" y Cloudflare lo
 * frena con un interstitial. Hay que pisarlo.)
 *
 * ── El error que costó caro ────────────────────────────────────────────────
 * Este archivo afirmaba que `/cart/?domains=x.com` dejaba el dominio "ya
 * adentro del carrito". Es FALSO, y la prueba que lo respaldaba estaba mal
 * leída: se había mirado la URL final y el HTML crudo, donde el dominio
 * aparece... porque Namecheap lo copia al `action` del <form>. Nada más.
 *
 *   GET /cart/?domains=probarrdap1-2026.com
 *     -> 200, redirige a /cart/customize/addons.aspx?domains=probarrdap1-2026.com
 *     -> el HTML es IDÉNTICO al de /cart/ SIN parámetro, salvo:
 *          · action="./addons.aspx?domains=probarrdap1-2026.com"  (el eco)
 *          · __VIEWSTATE / __EVENTVALIDATION (nonces)
 *          · un GUID de CMS
 *     -> renderizado en Chrome: el dominio NO está en el texto visible.
 *        Dice "Your Cart · Subtotal $0.00". El carrito está VACÍO.
 *
 * O sea: `?domains=` lo ignora el carrito. El usuario aterriza en una página
 * de upsell de addons con el carrito vacío — que es exactamente la "landing
 * genérica" que hay que evitar, con el agravante de que parece un carrito y
 * el usuario cree que algo salió mal.
 *
 *   GET /domains/registration/results/?domain=probarrdap1-2026.com   <-- EL BUENO
 *     -> 200, sin redirect. Renderizado en Chrome, el texto visible dice:
 *          "probarrdap1-2026.com · $11.08/yr · Retail $14.98/yr · Add to cart"
 *        Fila real del dominio pedido, con precio y botón de compra.
 *     -> Con `Accept-Language: es-AR` / `--lang=es-AR`: mismo resultado. No
 *        hay redirect regional que rompa el deep link.
 *     -> Si el dominio se registró entre la consulta RDAP y el click, degrada
 *        bien: muestra "google.com · Registered in 1997 · Make offer". Sigue
 *        siendo la página de ESE dominio, no una landing.
 *     -> Si el TLD no lo vende Namecheap, el renglón dice "Unsupported TLD".
 *        Ese caso lo ataja `NAMECHEAP_TLDS` más abajo.
 *
 *   Porkbun /checkout/search?q=x.com
 *     -> 200, server-side de verdad: <title> "porkbun.com | Domain Search
 *        Results for x.com". Sigue siendo específico incluso con un TLD que
 *        Porkbun no vende (probado con .bank y con .zzzzq), así que no
 *        necesita allowlist.
 *
 *   NameSilo /domain/search-domains?query=x.com
 *     -> 200 pero 6 KB y sin rastro del dominio. Descartado.
 */

export type RegistrarId = 'namecheap' | 'porkbun';

/**
 * A dónde apunta el link de compra.
 *
 * `search` — página de resultados del registrador para ESE dominio: precio,
 *            estado y botón "Add to cart". Un click extra para el usuario.
 * `cart`   — carrito del registrador precargado con el dominio.
 *
 * Se configura con `DOMAINS_LINK_TARGET`. El default es `search` y no es una
 * preferencia estética: ver `resolveLinkTarget()`.
 */
export type LinkTarget = 'cart' | 'search';

const DEFAULT_LINK_TARGET: LinkTarget = 'search';

/** Para no repetir el mismo warning en cada búsqueda. */
const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  logger.warn(message);
}

/**
 * Lee `DOMAINS_LINK_TARGET`.
 *
 * ── Por qué el default es `search` y no `cart` ─────────────────────────────
 * Porque `cart` está MEDIDO Y ROTO (ver el bloque de arriba): Namecheap ignora
 * `?domains=` y el usuario cae en un carrito vacío. `search` renderiza la fila
 * del dominio con precio y "Add to cart".
 *
 * El criterio del dueño es "cualquier página sirve mientras sea específica de
 * ese dominio". Hoy `search` es la única de las dos que cumple. `cart` queda
 * implementado igual, opt-in, por dos razones: es una decisión de producto que
 * le corresponde al dueño, y si Namecheap arregla el parámetro se puede volver
 * a `cart` cambiando una variable en vez de un deploy. Mientras tanto, elegirlo
 * avisa por log.
 */
export function resolveLinkTarget(): LinkTarget {
  const raw = process.env.DOMAINS_LINK_TARGET?.trim().toLowerCase();
  if (!raw) return DEFAULT_LINK_TARGET;

  if (raw === 'cart') {
    warnOnce(
      'cart',
      'DOMAINS_LINK_TARGET=cart: medido el 2026-08-27, Namecheap IGNORA el ' +
        'parámetro ?domains= y el usuario aterriza en un carrito VACÍO ' +
        '(Subtotal $0.00, sin el dominio). Usar "search" salvo que se haya ' +
        'vuelto a verificar que el carrito precarga.',
    );
    return 'cart';
  }

  if (raw === 'search') return 'search';

  warnOnce(
    `bad:${raw}`,
    `DOMAINS_LINK_TARGET="${raw}" no es un valor válido (cart|search); ` +
      `se usa "${DEFAULT_LINK_TARGET}".`,
  );
  return DEFAULT_LINK_TARGET;
}

/**
 * TLDs que Namecheap efectivamente vende.
 *
 * Existe porque el cliente puede pedir extensiones arbitrarias: `SearchDomainDto`
 * valida el FORMATO de `extensions`, no que el TLD sea comprable. Y RDAP
 * contesta `available` para TLDs que Namecheap no vende — `.bank` es el caso
 * típico: RDAP dice que está libre, Namecheap muestra "Unsupported TLD" y el
 * usuario tiene que volver a tipear el dominio en otro lado. Ese es justamente
 * el click que no queremos.
 *
 * Los 41 de esta lista se verificaron UNO POR UNO con el método headless del
 * bloque de arriba: en todos, el texto visible arranca con el dominio pedido y
 * ofrece "Add to cart". Verificados NO soportados: `.bank`, `.ar`, y los IDN
 * en punycode (`.xn--fiqs8s`), los tres con "Unsupported TLD".
 *
 * Las primeras 22 son las que este servicio genera solo (`DEFAULT_EXTENSIONS`
 * de `domains.service.ts` + `EXTRA_TLDS`/`VARIANT_TLDS` de `suggestions.ts`).
 * Si se agrega un TLD allá, hay que verificarlo y agregarlo acá, o el link se
 * deja de emitir. Es a propósito: falla cerrado.
 *
 * El resto son los que un usuario puede tipear a mano con más probabilidad.
 * La lista no pretende ser el catálogo completo de Namecheap (son cientos):
 * un TLD vendible que falte cuesta un click perdido, que es el lado barato del
 * error. Al revés cuesta un usuario que tiene que retipear el dominio.
 */
const NAMECHEAP_TLDS = new Set([
  // Las que genera el servicio.
  'com', 'io', 'app', 'tech', 'co', 'dev',
  'net', 'org', 'xyz', 'site', 'studio', 'agency', 'online', 'store',
  'digital', 'cloud', 'design', 'page', 'space', 'live', 'works', 'group',
  // Las que puede tipear el usuario.
  'ai', 'art', 'biz', 'blog', 'cc', 'club', 'email', 'info', 'life', 'me',
  'media', 'network', 'shop', 'solutions', 'today', 'tv', 'us', 'world',
  'co.uk',
]);

/**
 * El TLD de un dominio, quedándose con el sufijo MÁS LARGO que esté en la
 * lista. Sin eso, `marca.co.uk` matchearía `co` — que está en la lista, pero
 * es otro TLD, otro registro y otro precio.
 */
function namecheapTld(domain: string): string | null {
  const parts = domain.toLowerCase().split('.');
  for (let i = 1; i < parts.length; i += 1) {
    const candidate = parts.slice(i).join('.');
    if (NAMECHEAP_TLDS.has(candidate)) return candidate;
  }
  return null;
}

/**
 * URL de Namecheap para ESTE dominio, o `null` si no se puede garantizar que
 * sea específica.
 *
 * `null` no es un error: es la salvaguarda. Un click que termina en una página
 * genérica es peor que ningún click, porque el usuario tiene que volver a
 * tipear el dominio. Cuando esto devuelve `null` no se emite la oferta, y si
 * no queda ninguna el resultado sale con `registrarUrl: null` y `offers: []`.
 */
function namecheapUrl(domain: string, target: LinkTarget): string | null {
  if (!namecheapTld(domain)) {
    warnOnce(
      `tld:${domain.split('.').slice(1).join('.')}`,
      `Namecheap no vende el TLD de "${domain}" (o no está verificado en ` +
        'NAMECHEAP_TLDS): no se emite link. Ver el comentario de NAMECHEAP_TLDS.',
    );
    return null;
  }

  const encoded = encodeURIComponent(domain);
  return target === 'cart'
    ? `https://www.namecheap.com/cart/?domains=${encoded}`
    : `https://www.namecheap.com/domains/registration/results/?domain=${encoded}`;
}

/**
 * Porkbun no tiene deep link de carrito verificado, así que `cart` y `search`
 * apuntan a lo mismo. No es una omisión: `/checkout/search?q=` ya es específico
 * del dominio para cualquier TLD (probado con `.bank` y `.zzzzq`), que es lo
 * único que exige el criterio. Por eso tampoco devuelve `null` nunca.
 */
function porkbunUrl(domain: string): string {
  return `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
}

export interface RegistrarOffer {
  registrar: RegistrarId;
  registrarName: string;
  /** Deep link específico de este dominio. Nunca una landing genérica. */
  url: string;
  /**
   * Precio de referencia de ESTE registrador, o `null` si no lo sabemos.
   * `null` no es un error: hoy sólo Porkbun publica precios sin API key
   * (ver `pricing.service.ts`), así que la fila de Namecheap viene sin precio
   * a propósito. Antes que estimarlo, se deja vacío.
   */
  pricing: TldPricing | null;
}

/**
 * ── Afiliación ─────────────────────────────────────────────────────────────
 * Todavía no tenemos ID de afiliado, así que el lugar queda preparado y vacío.
 * Sin variable de entorno el link sale limpio y funciona igual; lo único que
 * se pierde es la comisión.
 *
 * NAMECHEAP AFILIA POR IMPACT (impact.com), no por ShareASale. El formato es:
 *
 *   https://namecheap.pxf.io/c/<TU_IMPACT_ID>/386170/5618?u=<destino encodeado>
 *
 * Probado de punta a punta con un ID de relleno (0000000) y el deep link de
 * BÚSQUEDA como destino:
 *
 *   GET https://namecheap.pxf.io/c/0000000/386170/5618?u=https%3A%2F%2Fwww.
 *       namecheap.com%2Fdomains%2Fregistration%2Fresults%2F%3Fdomain%3D
 *       probarrdap1-2026.com
 *   -> 200, URL final:
 *      .../results/?domain=probarrdap1-2026.com&clickID=...&affnetwork=ir&ref=ir
 *   -> renderizado en Chrome, el texto visible sigue mostrando
 *      "probarrdap1-2026.com · $11.08/yr · Add to cart".
 *
 * O sea: el wrapper de Impact CONSERVA el deep link Y agrega el tracking. Por
 * eso la variable es un TEMPLATE con `{url}` y no un sufijo: el destino tiene
 * que poder ir embebido y encodeado.
 *
 * Si en vez de Impact se eligiera Commission Junction, OJO: CJ concatena el
 * destino SIN encodear, así que no entra en este template y hay que tocar esta
 * función.
 *
 * ── Porkbun no tiene programa ──────────────────────────────────────────────
 * No hay `applyAffiliate` para Porkbun y no lo va a haber: porkbun.com/affiliate
 * responde 200 con "The affiliate program has been discontinued". Todo click
 * que se vaya a Porkbun es ingreso cedido de forma permanente. Ver
 * `compareEnabled()`.
 */
function applyAffiliate(registrar: RegistrarId, url: string): string {
  if (registrar === 'namecheap') {
    const template = process.env.NAMECHEAP_AFFILIATE_URL_TEMPLATE?.trim();
    if (!template || !template.includes('{url}')) return url;
    return template.replace('{url}', encodeURIComponent(url));
  }

  return url;
}

/**
 * ¿Se muestra el comparativo con un segundo registrador?
 *
 * Hay una tensión de negocio real acá y NO la resuelve este archivo. Porkbun
 * aparece CON precio y Namecheap SIN precio (su API pide key), así que el
 * comparativo empuja el click hacia Porkbun. Y como el programa de afiliados
 * de Porkbun está discontinuado, ese click no es "todavía no monetizado": es
 * plata que no se puede cobrar nunca.
 *
 * Se deja prendido igual porque el comparativo es información honesta y el
 * posicionamiento del producto es la confianza. Pero es una decisión de
 * negocio, no técnica, así que vive en una variable de entorno: se apaga sin
 * deploy si el dueño prefiere proteger la atribución.
 */
function compareEnabled(): boolean {
  return process.env.DOMAINS_COMPARE_REGISTRARS !== 'false';
}

/**
 * Arma las opciones de compra de un dominio DISPONIBLE. No llamar para
 * dominios registrados o no concluyentes: el llamador filtra por `available`.
 *
 * Puede devolver `[]`. Pasa cuando ningún registrador puede dar una página
 * específica de ese dominio — hoy: TLD fuera de `NAMECHEAP_TLDS` con el
 * comparativo apagado. Es el comportamiento buscado: sin oferta la UI no
 * ofrece botón, y el usuario no gasta un click para terminar retipeando.
 *
 * Namecheap va primero a propósito: es el registrador afiliado y el orden del
 * array es el orden de la UI.
 */
export function buildOffers(domain: string, pricing: TldPricing | null): RegistrarOffer[] {
  const target = resolveLinkTarget();
  const offers: RegistrarOffer[] = [];

  const namecheap = namecheapUrl(domain, target);
  if (namecheap) {
    offers.push({
      registrar: 'namecheap',
      registrarName: 'Namecheap',
      url: applyAffiliate('namecheap', namecheap),
      // Namecheap no publica precios sin API key. Ver pricing.service.ts.
      pricing: null,
    });
  }

  if (compareEnabled()) {
    offers.push({
      registrar: 'porkbun',
      registrarName: 'Porkbun',
      // Sin `applyAffiliate`: Porkbun discontinuó su programa. El link va limpio.
      url: porkbunUrl(domain),
      pricing,
    });
  }

  return offers;
}

/** El link principal: el primero de la lista, o `null` si no hay ninguno. */
export function primaryUrl(offers: RegistrarOffer[]): string | null {
  return offers[0]?.url ?? null;
}
