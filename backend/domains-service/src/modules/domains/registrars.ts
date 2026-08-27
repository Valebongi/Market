import type { TldPricing } from './pricing.service';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Deep links: probados, no leídos de la documentación
 * ═══════════════════════════════════════════════════════════════════════════
 * Namecheap responde 403 a curl sin User-Agent de navegador, así que todo esto
 * se verificó mandando un UA de Chrome y siguiendo los redirects:
 *
 *   /cart/addtocart.aspx?ProductType=DOMAIN&Domains=x.com&Years=1
 *     -> 200 pero redirige a /shoppingcart/?message-type=ERROR&message-body=missing
 *        FORMATO MUERTO. Es el que circula en blogs viejos.
 *
 *   /cart/addtocart.aspx?Domains=x.com
 *     -> mismo error. Muerto.
 *
 *   /domains/registration/results/?domain=x.com
 *     -> 200, sin redirect, el dominio aparece en el HTML.
 *        Es la PÁGINA DE RESULTADOS: el usuario todavía tiene que buscar la
 *        fila y apretar "Add to cart". Es lo que devolvía el servicio hasta
 *        ahora.
 *
 *   /cart/?domains=x.com                                        <-- EL BUENO
 *     -> 200, redirige a /cart/customize/addons.aspx?domains=x.com
 *        Ese es el paso POSTERIOR al alta en el carrito: el dominio ya está
 *        adentro y lo que se ofrece son los addons (WhoisGuard, hosting).
 *        Verificado también con dos dominios: ?domains=x.com,x.dev conserva
 *        los dos en la URL final.
 *
 * Ojo con una cosa: /cart/?domains= NO valida disponibilidad. Con google.com
 * también devuelve 200 y entra a addons. Por eso el link se emite ÚNICAMENTE
 * cuando RDAP confirmó `available`; si se emitiera siempre, mandaríamos gente
 * al carrito de dominios con dueño.
 *
 *   Porkbun  /checkout/search?q=x.com
 *     -> 200 y el HTML trae las filas de resultado ya renderizadas
 *        (id="searchResultRowDomain_x_com"). Prefill real, no eco del query.
 *
 *   NameSilo /domain/search-domains?query=x.com
 *     -> 200 pero 6 KB y sin rastro del dominio: shell de JS o bloqueo.
 *        Descartado.
 */

export type RegistrarId = 'namecheap' | 'porkbun';

export interface RegistrarOffer {
  registrar: RegistrarId;
  registrarName: string;
  /** Deep link al carrito con el dominio ya cargado. */
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
 * NAMECHEAP AFILIA POR IMPACT (impact.com), no por ShareASale. Verificado hoy:
 * namecheap.com/affiliates menciona Impact y Commission Junction, y no nombra
 * ShareASale en ningún lado. El formato de Impact es:
 *
 *   https://namecheap.pxf.io/c/<TU_IMPACT_ID>/386170/5618?u=<destino encodeado>
 *
 * Probado de punta a punta con un ID de relleno (0000000) y el deep link de
 * este archivo como destino:
 *
 *   GET https://namecheap.pxf.io/c/0000000/386170/5618?u=https%3A%2F%2Fwww.
 *       namecheap.com%2Fcart%2F%3Fdomains%3Dcarpinteria.site
 *   -> HTTP 200, y la URL final es
 *      https://www.namecheap.com/cart/customize/addons.aspx
 *        ?domains=carpinteria.site&clickID=...&affnetwork=ir&ref=ir
 *
 * O sea: el wrapper de Impact CONSERVA el deep link (el dominio llega al
 * carrito) y encima agrega el tracking. Por eso la variable es un TEMPLATE con
 * `{url}` y no un sufijo: el destino tiene que poder ir embebido y encodeado.
 *
 * Si en vez de Impact se eligiera Commission Junction, OJO: CJ concatena el
 * destino SIN encodear, así que no entra en este template y hay que tocar esta
 * función.
 *
 * ── Porkbun no tiene programa ──────────────────────────────────────────────
 * No hay `applyAffiliate` para Porkbun y no lo va a haber: porkbun.com/affiliate
 * responde HTTP 200 con "The affiliate program has been discontinued"
 * (verificado hoy, está hasta en el <meta name="description">). Todo click que
 * se vaya a Porkbun es ingreso cedido de forma permanente, no "todavía no
 * configurado". Ver `compareEnabled()`.
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
 * Namecheap va primero a propósito: es el registrador afiliado y el orden del
 * array es el orden de la UI.
 */
export function buildOffers(domain: string, pricing: TldPricing | null): RegistrarOffer[] {
  const encoded = encodeURIComponent(domain);

  const offers: RegistrarOffer[] = [
    {
      registrar: 'namecheap',
      registrarName: 'Namecheap',
      url: applyAffiliate('namecheap', `https://www.namecheap.com/cart/?domains=${encoded}`),
      // Namecheap no publica precios sin API key. Ver pricing.service.ts.
      pricing: null,
    },
  ];

  if (compareEnabled()) {
    offers.push({
      registrar: 'porkbun',
      registrarName: 'Porkbun',
      // Sin `applyAffiliate`: Porkbun discontinuó su programa. El link va limpio.
      url: `https://porkbun.com/checkout/search?q=${encoded}`,
      pricing,
    });
  }

  return offers;
}

/** El link principal: el primero de la lista, o `null` si no hay ninguno. */
export function primaryUrl(offers: RegistrarOffer[]): string | null {
  return offers[0]?.url ?? null;
}
