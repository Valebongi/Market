"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Globe,
  ExternalLink,
  Clock,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  Store,
} from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  domainsService,
  hasAnyPricing,
  toDomainPricingView,
  type DomainPricingView,
} from "@/services/domains.service";
import type {
  DomainResult,
  DomainSearchRecord,
  DomainSearchResponse,
  DomainStatus,
  DomainSuggestionKind,
  RegistrarOffer,
} from "@/types";

const EXTENSIONS = [".com", ".io", ".app", ".tech", ".co", ".dev"];

/**
 * Formateo de precios de dominio. NO usa `formatCurrency()` de `lib/utils`
 * a propósito: ese helper redondea a 0 decimales, y acá los centavos son
 * justamente la información que importa (`.tech` renueva a 50,98, no a 51).
 */
function formatPrice(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Moneda desconocida: mejor un número correcto que una excepción.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ── Estado del dominio ────────────────────────────────────────────────
/**
 * `registered` y `unknown` son cosas distintas y se pintan distinto.
 *
 * `available: false` agrupa a los dos, así que la UI mira `status`:
 * - `registered` → RDAP confirmó que tiene dueño.
 * - `unknown`    → no pudimos verificar. Pasa siempre con los registros que
 *   no publican RDAP (`.io`, `.co`, `.me`) y también ante un fallo puntual
 *   de la consulta. Decirle "no disponible" a alguien sobre un dominio que
 *   quizás esté libre es información falsa.
 */
const STATUS_UI: Record<
  DomainStatus,
  { label: string; pill: string; icon: string; hint?: string }
> = {
  available: {
    label: "Disponible",
    pill: "bg-emerald-50 text-deep-emerald dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: "text-deep-emerald dark:text-emerald-400",
  },
  registered: {
    label: "Ocupado",
    pill: "bg-red-50 text-soft-coral dark:bg-red-950/40 dark:text-red-400",
    icon: "text-slate-gray dark:text-gray-500",
    hint: "Ya tiene dueño.",
  },
  unknown: {
    label: "Sin verificar",
    pill: "bg-amber-50 text-warm-amber dark:bg-amber-950/40 dark:text-amber-400",
    icon: "text-warm-amber dark:text-amber-400",
    hint: "No pudimos verificar si está libre. Consultalo en el registrador antes de descartarlo.",
  },
};

function StatusPill({ status }: { status: DomainStatus }) {
  const ui = STATUS_UI[status];
  return (
    <span
      className={cn(
        "text-xs font-medium px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap",
        ui.pill
      )}
    >
      {ui.label}
    </span>
  );
}

const SUGGESTION_KIND_LABEL: Record<DomainSuggestionKind, string> = {
  tld: "Otra extensión",
  hyphen: "Sin guiones",
  prefix: "Con prefijo",
  suffix: "Con sufijo",
};

// ── Precio ────────────────────────────────────────────────────────────
/**
 * Los dos precios salen del mismo objeto y se renderizan juntos, siempre.
 * `DomainPricingView` no se puede construir con uno solo (ver
 * `toDomainPricingView`), así que acá no hay forma de mostrar el primer año
 * sin la renovación.
 */
function PricingBlock({ pricing }: { pricing: DomainPricingView }) {
  const sameForever = pricing.renewal === pricing.firstYear;
  /*
   * La renovación SIEMPRE se muestra. El ámbar es un segundo nivel de aviso
   * para los saltos que cambian la decisión de compra.
   *
   * El umbral es 2x y no 1.5x porque a 1.5x se prendía casi todo (medido
   * contra producción: `.app` 8,75→14,93 = 1,7x, `.dev` 8,75→12,87 = 1,5x) y
   * un ámbar que aparece siempre deja de significar algo. A 2x marca los
   * casos que realmente duelen: `.tech` 6,99→50,98 (7,3x), `.site`
   * 1,96→28,84 (14,7x), `.xyz` 2,04→14,21 (7x).
   */
  const bigJump = !sameForever && pricing.renewal >= pricing.firstYear * 2;

  if (sameForever) {
    return (
      <div className="sm:text-right">
        <p className="text-base font-semibold text-carbon-gray dark:text-gray-100 tabular-nums">
          {formatPrice(pricing.currency, pricing.firstYear)}
          <span className="text-xs font-normal text-slate-gray dark:text-gray-400">
            {" "}
            /año
          </span>
        </p>
        <p className="text-xs text-slate-gray dark:text-gray-400 mt-0.5">
          Mismo precio el primer año y la renovación
        </p>
      </div>
    );
  }

  return (
    <div className="sm:text-right">
      <p className="text-base font-semibold text-carbon-gray dark:text-gray-100 tabular-nums">
        {formatPrice(pricing.currency, pricing.firstYear)}
        <span className="text-xs font-normal text-slate-gray dark:text-gray-400">
          {" "}
          el primer año
        </span>
      </p>
      <p
        className={cn(
          "text-xs mt-0.5 font-medium tabular-nums",
          bigJump
            ? "text-warm-amber dark:text-amber-400"
            : // Sin ámbar sigue siendo información, no letra chica: se lee
              // con el mismo contraste que el resto del texto de la fila.
              "text-carbon-gray dark:text-gray-300"
        )}
      >
        Luego renueva a {formatPrice(pricing.currency, pricing.renewal)} por año
      </p>
    </div>
  );
}

function PricingAsOf({ pricing }: { pricing: DomainPricingView }) {
  return (
    <p className="text-[11px] text-slate-gray dark:text-gray-500 mt-0.5 sm:text-right">
      Precio de referencia · actualizado {formatRelativeTime(pricing.asOf)}
    </p>
  );
}

// ── Ofertas por registrador ───────────────────────────────────────────
function OffersList({
  offers,
  disclaimer,
}: {
  offers: RegistrarOffer[];
  disclaimer: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (offers.length < 2) return null;

  return (
    <div className="mt-3 pt-3 border-t border-fog-gray dark:border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-electric-blue dark:text-blue-400 hover:underline"
      >
        <Store className="h-3.5 w-3.5" />
        {open ? "Ocultar registradores" : `Comparar ${offers.length} registradores`}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {offers.map((offer) => {
            const offerPricing = toDomainPricingView(offer.pricing, disclaimer);
            return (
              <li
                key={offer.registrar}
                className="flex items-center justify-between gap-3 bg-snow-gray dark:bg-white/5 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-carbon-gray dark:text-gray-200 font-medium shrink-0">
                  {offer.registrarName}
                </span>
                <span className="flex-1 min-w-0 text-right">
                  {offerPricing ? (
                    <span className="text-xs text-slate-gray dark:text-gray-400 tabular-nums">
                      <span className="text-carbon-gray dark:text-gray-200 font-medium">
                        {formatPrice(offerPricing.currency, offerPricing.firstYear)}
                      </span>{" "}
                      el 1er año · renueva a{" "}
                      <span className="text-carbon-gray dark:text-gray-200 font-medium">
                        {formatPrice(offerPricing.currency, offerPricing.renewal)}
                      </span>
                    </span>
                  ) : (
                    // El backend hoy sólo conoce la lista de precios de un
                    // registrador. Decirlo es más honesto que dejar el hueco.
                    <span className="text-xs text-slate-gray dark:text-gray-500">
                      Sin precio publicado
                    </span>
                  )}
                </span>
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-electric-blue dark:text-blue-400 hover:underline shrink-0 inline-flex items-center gap-1"
                >
                  Ir
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Fila de dominio ───────────────────────────────────────────────────
function DomainRow({
  result,
  disclaimer,
  onSeeAlternatives,
}: {
  result: DomainResult;
  disclaimer: string | null;
  onSeeAlternatives?: () => void;
}) {
  const ui = STATUS_UI[result.status];
  const pricing = toDomainPricingView(result.pricing, disclaimer);
  const kindLabel = result.suggestionKind
    ? SUGGESTION_KIND_LABEL[result.suggestionKind]
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl px-4 sm:px-5 py-3 sm:py-4 hover:shadow-subtle transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Identidad */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Globe className={cn("h-5 w-5 shrink-0 mt-0.5", ui.icon)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono font-semibold text-carbon-gray dark:text-gray-100 truncate">
                {result.domain}
              </p>
              <StatusPill status={result.status} />
              {kindLabel && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-fog-gray dark:bg-white/10 text-slate-gray dark:text-gray-400">
                  {kindLabel}
                </span>
              )}
            </div>
            {ui.hint && (
              <p className="text-xs text-slate-gray dark:text-gray-400 mt-1">{ui.hint}</p>
            )}
            {result.available && !pricing && (
              <p className="text-xs text-slate-gray dark:text-gray-400 mt-1">
                No tenemos un precio de referencia para esta extensión.
              </p>
            )}
          </div>
        </div>

        {/* Precio + acción */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          {pricing && (
            <div>
              <PricingBlock pricing={pricing} />
              <PricingAsOf pricing={pricing} />
            </div>
          )}

          {result.available ? (
            <Button
              size="sm"
              className="shrink-0"
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              iconPosition="right"
              // `registrarUrl` es el link de AFILIACIÓN que arma el backend
              // por dominio. Mandar al usuario a la home del registrador
              // pierde la atribución (y con ella, la comisión). El backend
              // lo manda `null` sólo si el dominio no está disponible;
              // si igual falta, no hay nada útil que abrir.
              disabled={!result.registrarUrl}
              onClick={() => {
                if (result.registrarUrl) {
                  window.open(result.registrarUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              Registrar
            </Button>
          ) : (
            onSeeAlternatives && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={onSeeAlternatives}
              >
                Ver alternativas
              </Button>
            )
          )}
        </div>
      </div>

      <OffersList offers={result.offers} disclaimer={disclaimer} />
    </div>
  );
}

// ── Historial ─────────────────────────────────────────────────────────
/**
 * Lo que muestra la lista "Búsquedas Recientes".
 *
 * El historial guarda `DomainHistoryResult`: sólo `{domain, extension,
 * available, status}`. No trae precios ni links de compra, y no es un olvido
 * — un precio congelado hace días es información falsa. Por eso la lista
 * muestra la query y un recuento fechado, y para ver precios hay que
 * re-buscar.
 */
interface SearchHistoryItem {
  id: string;
  query: string;
  availableCount: number;
  unknownCount: number;
  checkedCount: number;
  searchedAt: string;
}

function toHistoryItems(records: DomainSearchRecord[]): SearchHistoryItem[] {
  return records.map((record) => {
    const results = record.results ?? [];
    return {
      id: record.id,
      query: record.query,
      availableCount: results.filter((r) => r.status === "available").length,
      unknownCount: results.filter((r) => r.status === "unknown").length,
      checkedCount: results.length,
      searchedAt: record.createdAt,
    };
  });
}

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const [selectedExts, setSelectedExts] = useState<string[]>([]);
  const [response, setResponse] = useState<DomainSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadHistory = useCallback(
    () =>
      domainsService
        .history(10)
        .then((records) => setHistory(toHistoryItems(records ?? [])))
        .catch(() => setHistory([])),
    []
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleExt = (ext: string) => {
    setSelectedExts((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  };

  const runSearch = useCallback(
    async (rawQuery: string, extensions?: string[]) => {
      // Si el usuario tipeó la extensión, la sacamos: el backend arma
      // `baseName × extensions` por su cuenta.
      const base = rawQuery.trim().replace(/\.\w+$/, "");
      if (!base) return;
      setLoading(true);
      setError(null);
      try {
        const res = await domainsService.search(base, extensions);
        setResponse(res);
        loadHistory();
      } catch {
        setResponse(null);
        setError("No pudimos completar la búsqueda. Probá de nuevo en unos segundos.");
      } finally {
        setLoading(false);
      }
    },
    [loadHistory]
  );

  const handleSearch = () =>
    runSearch(query, selectedExts.length > 0 ? selectedExts : undefined);

  const searchAgain = (historyQuery: string) => {
    setQuery(historyQuery);
    setSelectedExts([]);
    runSearch(historyQuery);
  };

  const scrollToAlternatives = () => {
    document.getElementById("alternativas")?.scrollIntoView({ behavior: "smooth" });
  };

  // El disclaimer de precios es obligatorio cuando hay CUALQUIER precio en
  // pantalla — de `results`, de `suggestions` o de un `offers[]`.
  // `hasAnyPricing` barre las tres cosas. Si el backend no mandó el texto,
  // `toDomainPricingView` ya devolvió `null` en todos lados: no quedó ningún
  // precio que aclarar y tampoco se pinta el bloque.
  const showPricingDisclaimer = useMemo(
    () => (response ? hasAnyPricing(response) && !!response.pricingDisclaimer : false),
    [response]
  );

  const hasUnknown = useMemo(
    () => (response ? response.results.some((r) => r.status === "unknown") : false),
    [response]
  );

  const suggestions = response?.suggestions ?? [];
  const isEmpty =
    response !== null && response.results.length === 0 && suggestions.length === 0;

  return (
    <div className="p-4 sm:p-8 max-w-standard mx-auto">
      {/* Header */}
      <div className="pb-6 sm:pb-8 border-b border-fog-gray dark:border-white/10">
        <h1 className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100">
          Buscar Dominios
        </h1>
        <p className="text-sm sm:text-base text-slate-gray dark:text-gray-400 mt-1">
          Encontrá el dominio perfecto para tu proyecto
        </p>
      </div>

      {/* Hero Search */}
      <div className="py-6 sm:py-10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center border-2 border-fog-gray dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-electric-blue focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all bg-white dark:bg-gray-900 h-14">
            <Search className="ml-4 h-5 w-5 text-slate-gray dark:text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Escribí el nombre de tu proyecto o dominio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="flex-1 h-full px-3 text-base bg-transparent focus:outline-none text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500"
            />
            <Button onClick={handleSearch} loading={loading} className="m-1.5 rounded-xl">
              Buscar
            </Button>
          </div>

          {/* Extension chips */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {EXTENSIONS.map((ext) => (
              <button
                key={ext}
                onClick={() => toggleExt(ext)}
                aria-pressed={selectedExts.includes(ext)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  selectedExts.includes(ext)
                    ? "bg-electric-blue text-white border-electric-blue"
                    : "bg-white dark:bg-gray-900 text-slate-gray dark:text-gray-400 border-fog-gray dark:border-white/10 hover:border-electric-blue hover:text-electric-blue"
                )}
              >
                {ext}
              </button>
            ))}
            {selectedExts.length > 0 && (
              <button
                onClick={() => setSelectedExts([])}
                className="px-3 py-1.5 rounded-full text-sm text-slate-gray dark:text-gray-400 hover:text-soft-coral transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-fog-gray dark:bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-soft-coral/40 mt-4">
          <AlertCircle className="h-4 w-4 text-soft-coral dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-soft-coral dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {response && !loading && !error && (
        <div className="mt-4 space-y-6">
          {isEmpty ? (
            <EmptyState
              size="sm"
              title="No encontramos dominios para esa búsqueda."
              description="Probá con otro nombre o con menos caracteres especiales."
            />
          ) : (
            <>
              {response.results.length > 0 && (
                <section className="space-y-3">
                  <p className="text-sm text-slate-gray dark:text-gray-400">
                    {response.results.length}{" "}
                    {response.results.length === 1 ? "resultado" : "resultados"} para{" "}
                    <span className="font-mono text-carbon-gray dark:text-gray-200">
                      {response.baseName}
                    </span>
                  </p>

                  {response.results.map((result) => (
                    <DomainRow
                      key={result.domain}
                      result={result}
                      disclaimer={response.pricingDisclaimer}
                      onSeeAlternatives={
                        suggestions.length > 0 ? scrollToAlternatives : undefined
                      }
                    />
                  ))}

                  {/*
                    "Sin verificar" no es "ocupado". Explicarlo una vez, con el
                    motivo real, evita que el usuario descarte un dominio que
                    quizás esté libre.
                  */}
                  {hasUnknown && (
                    <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-warm-amber/30">
                      <HelpCircle className="h-4 w-4 text-warm-amber dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-carbon-gray dark:text-gray-300">
                        <span className="font-medium">
                          Algunos dominios quedaron sin verificar.
                        </span>{" "}
                        No significa que estén ocupados. Hay registros —{" "}
                        <span className="font-mono">.io</span>,{" "}
                        <span className="font-mono">.co</span> y{" "}
                        <span className="font-mono">.me</span>, entre otros — que no
                        publican datos abiertos de disponibilidad, y a veces la consulta
                        simplemente no responde. Para salir de la duda, buscalos directo
                        en el registrador.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Alternativas */}
              {suggestions.length > 0 && (
                <section id="alternativas" className="space-y-3 scroll-mt-6">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-electric-blue dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">
                        Alternativas disponibles
                      </h2>
                      <p className="text-sm text-slate-gray dark:text-gray-400">
                        Variantes de{" "}
                        <span className="font-mono">{response.baseName}</span> que sí
                        están libres.
                      </p>
                    </div>
                  </div>

                  {suggestions.map((suggestion) => (
                    <DomainRow
                      key={suggestion.domain}
                      result={suggestion}
                      disclaimer={response.pricingDisclaimer}
                    />
                  ))}
                </section>
              )}

              {/*
                `meta.pricingAvailable === false` significa que el proveedor de
                precios no respondió. Decirlo es mejor que dejar la columna de
                precios vacía sin explicación (y que inventar un fallback).
              */}
              {!response.meta.pricingAvailable && (
                <div className="flex items-start gap-2 p-4 bg-snow-gray dark:bg-white/5 rounded-xl border border-fog-gray dark:border-white/10">
                  <AlertCircle className="h-4 w-4 text-slate-gray dark:text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-gray dark:text-gray-400">
                    No pudimos traer los precios de referencia en este momento. La
                    disponibilidad sí es real; el precio lo vas a ver en el sitio del
                    registrador.
                  </p>
                </div>
              )}

              {/* Aclaraciones */}
              <div className="space-y-2">
                {showPricingDisclaimer && (
                  <div className="flex items-start gap-2 p-4 bg-snow-gray dark:bg-white/5 rounded-xl border border-fog-gray dark:border-white/10">
                    <AlertCircle className="h-4 w-4 text-slate-gray dark:text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-gray dark:text-gray-400">
                      {response.pricingDisclaimer}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2 p-4 bg-snow-gray dark:bg-white/5 rounded-xl border border-fog-gray dark:border-white/10">
                  <AlertCircle className="h-4 w-4 text-slate-gray dark:text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-gray dark:text-gray-400">
                    Da Vinci Inventa recibe una comisión por las referencias al
                    registrador de dominios. El registro y el cobro los hace el
                    registrador, no nosotros.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Búsquedas recientes */}
      {!response && !loading && !error && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-carbon-gray dark:text-gray-100 mb-4">
            Búsquedas Recientes
          </h2>
          {history.length === 0 && (
            <EmptyState size="sm" title="No hay búsquedas recientes." />
          )}
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl px-5 py-3 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Globe
                    className={cn(
                      "h-4 w-4 shrink-0",
                      item.availableCount > 0
                        ? "text-deep-emerald dark:text-emerald-400"
                        : "text-slate-gray dark:text-gray-500"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-carbon-gray dark:text-gray-100 truncate">
                      {item.query}
                    </p>
                    {/*
                      El historial guarda el estado del momento de la búsqueda,
                      no el de ahora, y no guarda precios. Por eso se etiqueta
                      como histórico ("entonces") y la única acción es re-buscar.
                    */}
                    <p className="text-xs text-slate-gray dark:text-gray-400 flex items-center gap-1 mt-0.5 flex-wrap">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(item.searchedAt)}
                      <span aria-hidden>·</span>
                      <span>
                        {item.availableCount} de {item.checkedCount} libres entonces
                        {item.unknownCount > 0 &&
                          `, ${item.unknownCount} sin verificar`}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => searchAgain(item.query)}
                >
                  Buscar de nuevo
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
