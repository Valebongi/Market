import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDomainDto } from './dto/search-domain.dto';
import {
  AvailabilityResult,
  RDAP_CONCURRENCY,
  RDAP_MAX_LOOKUPS,
  RDAP_MAX_RETRIES,
  RetryBudget,
  checkDomainAvailability,
  logInconclusive,
  mapWithConcurrency,
  newRetryBudget,
} from './rdap';
import { PRICING_DISCLAIMER, PricingService, TldPricing } from './pricing.service';
import { RegistrarOffer, buildOffers, primaryUrl } from './registrars';
import {
  MAX_SUGGESTION_LOOKUPS,
  SuggestionCandidate,
  buildSuggestionCandidates,
} from './suggestions';

const DEFAULT_EXTENSIONS = ['.com', '.io', '.app', '.tech', '.co', '.dev'];

/** Largo máximo de una etiqueta DNS. */
const MAX_LABEL_LENGTH = 63;

export interface DomainResult {
  domain: string;
  extension: string;
  /**
   * `true` SÓLO con confirmación de RDAP. Todo lo demás —timeout, 429, TLD
   * fuera del bootstrap de IANA— llega acá como `false`, a propósito.
   */
  available: boolean;
  /**
   * El detalle detrás de `available`. Existe porque `available: false` mezclaba
   * dos cosas muy distintas de cara al usuario: "este dominio tiene dueño"
   * (`registered`) y "no pudimos verificarlo" (`unknown`, que es lo que pasa
   * SIEMPRE con `.io`, `.co` y `.me` porque no publican RDAP). Mostrar las dos
   * como "No disponible" es decir algo que no sabemos.
   *
   * `available` sigue siendo el booleano de decisión: la regla de nunca dar un
   * falso positivo no cambia. `status` es sólo para redactar el cartel.
   */
  status: AvailabilityResult;
  /**
   * Deep link principal (el primero de `offers`). `null` si no está disponible.
   * Se mantiene el nombre del campo para no romper a los consumidores actuales,
   * pero el destino cambió: antes iba a la página de RESULTADOS de Namecheap,
   * ahora va al CARRITO con el dominio ya cargado.
   */
  registrarUrl: string | null;
  /** Opciones de compra por registrador. `[]` si no está disponible. */
  offers: RegistrarOffer[];
  /**
   * Precio de referencia del TLD, o `null` si no lo sabemos. Sólo se completa
   * cuando `available === true`: poner precio al lado de un dominio con dueño
   * insinúa que se puede comprar.
   */
  pricing: TldPricing | null;
  /** Sólo en `suggestions`: qué familia de variante generó este nombre. */
  suggestionKind?: SuggestionCandidate['kind'];
}

/**
 * Lo que se guarda en `DomainSearch.results`. A propósito NO incluye precios ni
 * links: el historial se lee días después, y un precio o un link al carrito
 * congelados en el tiempo son información falsa en el momento en que alguien
 * los mira. Lo que sí sobrevive es qué se buscó y qué contestó RDAP entonces.
 */
interface HistoryEntry {
  domain: string;
  extension: string;
  available: boolean;
  status: AvailabilityResult;
}

/**
 * Normaliza lo que tipeó el usuario a una etiqueta DNS.
 *
 * Los acentos se TRANSLITERAN, no se reemplazan por guiones. Antes:
 *
 *   "diseño"    -> "dise-o"      (guion en el medio de la palabra)
 *   "mi marca"  -> "mi-marca"
 *   "mi  marca" -> "mi--marca"   (etiqueta fea y ambigua)
 *   "café"      -> "caf-"  -> "caf"
 *
 * Ahora `NFD` + descarte de diacríticos convierte `ñ`->`n`, `á`->`a`, `ü`->`u`,
 * que es exactamente lo que la gente registra en la práctica: `diseno.com`,
 * `cafe.com`. No se usa punycode/IDN a propósito — un `xn--` complica el link
 * al registrador y el chequeo RDAP, y casi nadie construye una marca sobre un
 * dominio con acentos.
 *
 * Los espacios siguen cayendo en `-`, pero ahora se colapsan los repetidos.
 * Ese guion es además la ÚNICA señal confiable de dónde corta el nombre, y
 * `suggestions.ts` la usa para ofrecer la variante sin guion.
 */
function toBaseName(raw: string): string {
  return raw
    .normalize('NFD')
    // El rango de la clase es U+0300..U+036F, el bloque "Combining Diacritical Marks".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LABEL_LENGTH)
    .replace(/-+$/g, '');
}

function normalizeExtensions(requested?: string[]): string[] {
  const source = requested?.length ? requested : DEFAULT_EXTENSIONS;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ext of source) {
    const normalized = ext.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async search(userId: string, dto: SearchDomainDto) {
    const extensions = normalizeExtensions(dto.extensions);
    const baseName = toBaseName(dto.query);

    // Una query como "!!!" se sanitizaba a "-" y salíamos a consultar "-.com".
    // Sin nombre no hay nada que buscar: se corta acá.
    if (!baseName) {
      return {
        query: dto.query,
        baseName: '',
        results: [],
        suggestions: [],
        pricingDisclaimer: null,
        meta: {
          rdapLookups: 0,
          rdapCacheHits: 0,
          rdapRetries: 0,
          pricingAvailable: false,
          checkedAt: new Date().toISOString(),
        },
      };
    }

    // Un presupuesto por búsqueda, compartido entre el nombre exacto y las
    // sugerencias. Ver `RetryBudget` en rdap.ts.
    const retryBudget = newRetryBudget();

    let lookups = 0;
    let cacheHits = 0;
    const spend = (cached: boolean): void => {
      if (cached) cacheHits += 1;
      else lookups += 1;
    };

    // ── Nombre exacto ─────────────────────────────────────────────────────
    const exactTargets = extensions
      .slice(0, RDAP_MAX_LOOKUPS)
      .map((extension) => ({ domain: `${baseName}${extension}`, extension }));

    const results = await mapWithConcurrency(
      exactTargets,
      RDAP_CONCURRENCY,
      async ({ domain, extension }) => this.resolve(domain, extension, spend, retryBudget),
    );

    // ── Sugerencias ───────────────────────────────────────────────────────
    // Sólo si el nombre exacto no quedó disponible en NINGUNA extensión. Si
    // hay aunque sea una, el usuario ya tiene qué comprar y no vale la pena
    // gastar consultas RDAP ni alargarle la espera.
    const anyAvailable = results.some((r) => r.available);
    const budget = Math.min(MAX_SUGGESTION_LOOKUPS, RDAP_MAX_LOOKUPS - lookups - cacheHits);

    let suggestions: DomainResult[] = [];
    if (!anyAvailable && budget > 0) {
      const candidates = buildSuggestionCandidates(
        baseName,
        exactTargets.map((t) => t.domain),
      ).slice(0, budget);

      const checked = await mapWithConcurrency(
        candidates,
        RDAP_CONCURRENCY,
        async (candidate) => ({
          ...(await this.resolve(candidate.domain, candidate.extension, spend, retryBudget)),
          suggestionKind: candidate.kind,
        }),
      );

      // Una sugerencia que no está disponible no es una sugerencia: es una
      // fila más de "No disponible" en una pantalla que ya está llena de eso.
      // Se filtran y sólo sobreviven las comprables.
      suggestions = checked.filter((r) => r.available);
    }

    const pricingAvailable = this.pricing.isPricingAvailable();
    const showsAnyPrice = [...results, ...suggestions].some((r) => r.pricing !== null);

    await this.persist(userId, dto.query, results);

    return {
      query: dto.query,
      baseName,
      results,
      suggestions,
      /**
       * Texto obligatorio de la UI cuando se muestra algún precio. Viaja desde
       * el backend a propósito: la regla "el precio es de referencia, no el
       * final" es del servicio que trae los precios, y no puede quedar sujeta
       * a que cada pantalla se acuerde de escribirla.
       */
      pricingDisclaimer: showsAnyPrice ? PRICING_DISCLAIMER : null,
      meta: {
        rdapLookups: lookups,
        rdapCacheHits: cacheHits,
        rdapRetries: RDAP_MAX_RETRIES - retryBudget.left,
        pricingAvailable,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  private async resolve(
    domain: string,
    extension: string,
    spend: (cached: boolean) => void,
    retryBudget: RetryBudget,
  ): Promise<DomainResult> {
    const { status, cached, reason } = await checkDomainAvailability(domain, retryBudget);
    spend(cached);

    // Sólo un "available" comprobado genera links de compra. `unknown` (TLD
    // fuera del bootstrap, timeout, rate limit) se reporta como NO disponible:
    // preferimos perder un click antes que mandar a alguien a comprar un
    // dominio que ya tiene dueño.
    const available = status === 'available';

    if (status === 'unknown' && !cached) {
      logInconclusive(domain, reason);
    }

    const pricing = available ? this.pricing.getTldPricing(extension) : null;
    const offers = available ? buildOffers(domain, pricing) : [];

    return {
      domain,
      extension,
      available,
      status,
      registrarUrl: primaryUrl(offers),
      offers,
      pricing,
    };
  }

  private async persist(userId: string, query: string, results: DomainResult[]): Promise<void> {
    const entries: HistoryEntry[] = results.map(({ domain, extension, available, status }) => ({
      domain,
      extension,
      available,
      status,
    }));

    try {
      await this.prisma.domainSearch.create({
        data: { userId, query, results: entries as unknown as object },
      });
    } catch (error) {
      // El historial es secundario: si falla el insert, el usuario igual tiene
      // que ver su búsqueda. Antes esto tiraba el request entero.
      this.logger.error(
        `No se pudo guardar la búsqueda "${query}" de ${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async getHistory(userId: string, limit = 10) {
    return this.prisma.domainSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
