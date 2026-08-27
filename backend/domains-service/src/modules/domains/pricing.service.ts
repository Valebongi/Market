import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * De dónde salen los precios
 * ═══════════════════════════════════════════════════════════════════════════
 * Requisito: fuente sin costo y sin contrato. Lo que se probó, con el resultado
 * real de cada prueba:
 *
 *   Porkbun   POST https://api.porkbun.com/api/json/v3/pricing/get  body {}
 *             -> HTTP 200, 82 KB, 907 TLDs, SIN API KEY.
 *                {"status":"SUCCESS","pricing":{"com":{"registration":"11.08",
 *                 "renewal":"11.08","transfer":"11.08","coupons":[]}, ...}}
 *
 *   Gandi     GET https://api.gandi.net/v5/domain/pricing?name=x.com
 *             -> HTTP 401 "You must provide an access token or an API Key".
 *
 *   Namecheap su API (namecheap.users.getPricing) pide API key + whitelist de
 *             IP + saldo mínimo en la cuenta. No es keyless.
 *
 *   Dynadot / NameSilo / INWX: todas piden key.
 *
 * O sea que Porkbun es la ÚNICA fuente real, gratuita y sin contrato que
 * devuelve precios hoy. Por eso NO hay tabla de precios hardcodeada: una tabla
 * a mano envejece en silencio y nadie se entera hasta que un usuario paga otra
 * cosa. Esto es dato vivo, con fecha de obtención (`asOf`) que viaja a la UI.
 *
 * Lo que SÍ hay que decir en la UI: son precios de LISTA DE PORKBUN, no el
 * precio final que va a pagar el usuario en el registrador que elija. De ahí
 * `isReference: true` y `PRICING_DISCLAIMER`.
 *
 * ── El dato más valioso acá es el renewal ──────────────────────────────────
 * Los registradores venden el primer año a pérdida. Medido en la respuesta real:
 *
 *   .tech   registration  6.99  ->  renewal 50.98   (x7.3)
 *   .shop   registration  2.06  ->  renewal 31.41   (x15.2)
 *   .online registration  1.96  ->  renewal 28.84   (x14.7)
 *   .io     registration 28.12  ->  renewal 51.80   (x1.8)
 *   .com    registration 11.08  ->  renewal 11.08   (x1)
 *
 * Mostrar sólo el primer año sería técnicamente cierto y prácticamente una
 * trampa: `.shop` a "USD 2,06" es un dominio de USD 31 por año a partir del
 * segundo. Por eso `renewal` es parte del contrato y no un extra opcional.
 */
const PORKBUN_PRICING_URL = 'https://api.porkbun.com/api/json/v3/pricing/get';

/** El endpoint devuelve 907 TLDs; 82 KB. No hace falta pedirlo seguido. */
const PRICING_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Si Porkbun se cae, se sigue sirviendo la última tabla buena hasta 7 días.
 * Pasado ese punto se devuelve `null` y la UI no muestra precio: un precio de
 * hace dos semanas es peor que no mostrar nada en un flujo donde el usuario
 * está por gastar plata.
 */
const PRICING_STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 20s, y no es un descuido. Medido tres veces contra el endpoint real desde
 * esta máquina:
 *
 *   total 13.73s  (connect 0.33 / TLS 1.48 / TTFB 13.47)
 *   total 10.51s  (connect 0.25 / TLS 0.74 / TTFB 10.26)
 *   total 11.61s  (connect 0.25 / TLS 0.87 / TTFB 11.31)
 *
 * Todo el tiempo está en el TTFB: Porkbun arma la tabla de los 907 TLDs en
 * cada request. Con 8s la primera versión de este archivo se pasaba de
 * timeout SIEMPRE y el servicio respondía sin precios para siempre.
 *
 * Que el timeout sea grande es tolerable SÓLO porque esta llamada nunca está
 * en el camino de una búsqueda: ver el comentario de `getTldPricing`.
 */
const PORKBUN_TIMEOUT_MS = 20000;

export const PRICING_CURRENCY = 'USD';

export const PRICING_DISCLAIMER =
  'Precios de referencia (lista pública de Porkbun, USD/año, sin impuestos). ' +
  'No son el precio final: cada registrador cobra lo suyo y puede aplicar ' +
  'promociones. Verificá el total en el sitio del registrador antes de pagar.';

export interface TldPricing {
  currency: string;
  /** Precio de alta del primer año. */
  firstYear: number;
  /** Precio de renovación anual a partir del segundo año. */
  renewal: number;
  /** ISO 8601 — cuándo se trajo esta tabla de Porkbun. */
  asOf: string;
  /** Siempre `true`. La UI está obligada a marcarlo como referencia. */
  isReference: true;
  source: 'porkbun';
}

type PricingTable = Map<string, { firstYear: number; renewal: number }>;

/**
 * Porkbun manda los importes como string (`"11.08"`). Se rechaza todo lo que no
 * parsee a un número finito y positivo: preferimos no mostrar precio para ese
 * TLD antes que mostrar `NaN`, `0` o un negativo. La regla del servicio es "no
 * inventes precios", y un `0` es un precio inventado.
 */
function parseAmount(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = typeof raw === 'number' ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);

  private table: PricingTable | null = null;
  private fetchedAt = 0;
  /** Dedupe: N búsquedas concurrentes en frío no disparan N fetch a Porkbun. */
  private inFlight: Promise<void> | null = null;

  private get enabled(): boolean {
    return process.env.DOMAINS_PRICING_ENABLED !== 'false';
  }

  /**
   * Se precalienta la tabla al arrancar, sin `await`: si Porkbun tarda 14s o
   * está caído, el servicio igual queda listo para responder. La única
   * consecuencia de arrancar en frío es que las búsquedas del primer ~15s
   * salen sin precio, y eso ya se comunica con `pricingAvailable: false`.
   */
  onModuleInit(): void {
    if (!this.enabled) return;
    this.kickRefresh();
  }

  /**
   * SÍNCRONO A PROPÓSITO. Si esto devolviera una promesa que espera a Porkbun,
   * una búsqueda podría quedar colgada 20s por un dato que es OPCIONAL y
   * global (la misma tabla de 907 TLDs para todos los usuarios).
   *
   * Al ser sync, es estructuralmente imposible que la latencia de Porkbun
   * entre en el camino de una búsqueda: se responde con la tabla que haya en
   * memoria y, si está vencida, se dispara el refresh EN SEGUNDO PLANO para la
   * próxima. Peor caso: esta búsqueda sale sin precio. Nunca: esta búsqueda
   * tarda 20 segundos.
   *
   * `null` es un resultado legítimo y frecuente: TLD fuera del catálogo de
   * Porkbun, tabla todavía sin cargar, tabla vencida, Porkbun caído, feature
   * apagada. Nunca se completa con una estimación.
   */
  getTldPricing(extension: string): TldPricing | null {
    if (!this.enabled) return null;

    this.kickRefreshIfStale();
    if (!this.table) return null;

    // La tabla de Porkbun viene sin punto inicial: "com", "co.uk".
    const key = extension.replace(/^\./, '').toLowerCase();
    const row = this.table.get(key);
    if (!row) return null;

    return {
      currency: PRICING_CURRENCY,
      firstYear: row.firstYear,
      renewal: row.renewal,
      asOf: new Date(this.fetchedAt).toISOString(),
      isReference: true,
      source: 'porkbun',
    };
  }

  /**
   * `true` si hay tabla utilizable. La UI usa esto para decidir si explica la
   * ausencia total de precios en vez de repetir el hueco fila por fila.
   */
  isPricingAvailable(): boolean {
    if (!this.enabled) return false;
    this.kickRefreshIfStale();
    return this.table !== null;
  }

  private kickRefreshIfStale(): void {
    if (this.table && Date.now() - this.fetchedAt < PRICING_TTL_MS) return;
    this.kickRefresh();
  }

  /** Dispara el refresh sin esperarlo, con dedupe de la request en vuelo. */
  private kickRefresh(): void {
    if (this.inFlight) return;
    this.inFlight = this.refresh()
      .catch(() => undefined)
      .finally(() => {
        this.inFlight = null;
      });
  }

  private async refresh(): Promise<void> {
    try {
      const response = await fetch(PORKBUN_PRICING_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(PORKBUN_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.expireIfTooStale(`HTTP ${response.status}`);
        return;
      }

      const payload = (await response.json()) as {
        status?: string;
        pricing?: Record<string, unknown>;
      };

      if (payload?.status !== 'SUCCESS' || !payload.pricing) {
        this.expireIfTooStale(`status=${payload?.status}`);
        return;
      }

      const table: PricingTable = new Map();
      for (const [tld, value] of Object.entries(payload.pricing)) {
        const row = value as Record<string, unknown>;
        const firstYear = parseAmount(row?.registration);
        // Si falta el renewal se usa el de alta: es lo que pasa en los TLDs
        // legacy donde alta y renovación coinciden (.com, .net). Si falta el
        // de alta, el TLD se descarta entero.
        const renewal = parseAmount(row?.renewal) ?? firstYear;
        if (firstYear === null || renewal === null) continue;
        table.set(tld.toLowerCase(), { firstYear, renewal });
      }

      if (table.size === 0) {
        this.expireIfTooStale('tabla vacía');
        return;
      }

      this.table = table;
      this.fetchedAt = Date.now();
      this.logger.log(`Tabla de precios de Porkbun actualizada: ${table.size} TLDs`);
    } catch (error) {
      this.expireIfTooStale(error instanceof Error ? error.message : 'error desconocido');
    }
  }

  /**
   * Falló el refresh. Se conserva la tabla anterior (mejor un precio de ayer
   * que ningún precio) salvo que ya esté demasiado vieja, en cuyo caso se tira
   * y el servicio pasa a no mostrar precios.
   */
  private expireIfTooStale(reason: string): void {
    if (!this.table) {
      this.logger.warn(`Sin precios de Porkbun (${reason}); se responde sin precio`);
      return;
    }

    if (Date.now() - this.fetchedAt > PRICING_STALE_MAX_MS) {
      this.logger.warn(
        `Precios de Porkbun vencidos (${reason}); se descarta la tabla y se responde sin precio`,
      );
      this.table = null;
      this.fetchedAt = 0;
      return;
    }

    this.logger.warn(`Refresh de precios falló (${reason}); se sirve la tabla anterior`);
  }
}
