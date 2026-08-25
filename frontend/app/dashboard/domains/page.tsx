"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Globe, ExternalLink, Clock, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { cn, formatRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/lib/http";
import { domainsService as domainsApi } from "@/services/domains.service";
import type { DomainResult } from "@/types";

/**
 * Fila de `GET /domains/history` — es el modelo Prisma `DomainSearch` de
 * domains-service: **una búsqueda entera**, no un dominio suelto.
 * (`domainsService.history()` la declara como `DomainSearchResponse[]`, que es
 * el shape de `POST /domains/search`; por eso acá se pide con `apiFetch`.)
 */
interface DomainSearchRecord {
  id: string;
  userId: string;
  query: string;
  results: DomainResult[];
  createdAt: string;
}

/** Lo que muestra la lista "Búsquedas Recientes". */
interface SearchHistoryItem {
  id: string;
  domain: string;
  available: boolean;
  searchedAt: string;
}

/**
 * Cada búsqueda guarda N dominios (uno por extensión). Para la lista mostramos
 * el primero disponible y, si ninguno lo está, el primero del lote.
 */
function toHistoryItems(records: DomainSearchRecord[]): SearchHistoryItem[] {
  return records.map((record) => {
    const results = record.results ?? [];
    const highlighted = results.find((r) => r.available) ?? results[0];
    return {
      id: record.id,
      domain: highlighted?.domain ?? record.query,
      available: highlighted?.available ?? false,
      searchedAt: record.createdAt,
    };
  });
}

const EXTENSIONS = [".com", ".io", ".app", ".tech", ".co", ".dev"];

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const [selectedExts, setSelectedExts] = useState<string[]>([]);
  const [results, setResults] = useState<DomainResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadHistory = useCallback(
    () =>
      apiFetch<DomainSearchRecord[]>("/domains/history")
        .then((records) => setHistory(toHistoryItems(records ?? []).slice(0, 10)))
        .catch(() => setHistory([])),
    []
  );

  // Load search history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleExt = (ext: string) => {
    setSelectedExts((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // Strip extension from query if user typed one
      const base = query.trim().replace(/\.\w+$/, "");
      const extensions = selectedExts.length > 0 ? selectedExts : undefined;
      const res = await domainsApi.search(base, extensions);
      setResults(res.results ?? []);
      // Refresh history after search
      loadHistory();
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-standard mx-auto">
      {/* Header */}
      <div className="pb-6 sm:pb-8 border-b border-fog-gray">
        <h1 className="text-2xl sm:text-3xl font-bold text-carbon-gray">Buscar Dominios</h1>
        <p className="text-sm sm:text-base text-slate-gray mt-1">
          Encontrá el dominio perfecto para tu proyecto
        </p>
      </div>

      {/* Hero Search */}
      <div className="py-6 sm:py-10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center border-2 border-fog-gray rounded-2xl overflow-hidden focus-within:border-electric-blue focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all bg-white h-14">
            <Search className="ml-4 h-5 w-5 text-slate-gray shrink-0" />
            <input
              type="text"
              placeholder="Escribí el nombre de tu proyecto o dominio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="flex-1 h-full px-3 text-base bg-transparent focus:outline-none text-carbon-gray"
            />
            <Button
              onClick={handleSearch}
              loading={loading}
              className="m-1.5 rounded-xl"
            >
              Buscar
            </Button>
          </div>

          {/* Extension chips */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {EXTENSIONS.map((ext) => (
              <button
                key={ext}
                onClick={() => toggleExt(ext)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  selectedExts.includes(ext)
                    ? "bg-electric-blue text-white border-electric-blue"
                    : "bg-white text-slate-gray border-fog-gray hover:border-electric-blue hover:text-electric-blue"
                )}
              >
                {ext}
              </button>
            ))}
            {selectedExts.length > 0 && (
              <button
                onClick={() => setSelectedExts([])}
                className="px-3 py-1.5 rounded-full text-sm text-slate-gray hover:text-soft-coral transition-colors"
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
            <div key={i} className="h-16 bg-fog-gray rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-gray">{results.length} resultados para &ldquo;{query}&rdquo;</p>
          {results.map((result) => (
            <div
              key={result.domain}
              className="flex items-center justify-between bg-white border border-fog-gray rounded-xl px-4 sm:px-5 py-3 sm:py-4 hover:shadow-subtle transition-all gap-3"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <Globe className={cn("h-5 w-5 shrink-0", result.available ? "text-deep-emerald" : "text-slate-gray")} />
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-carbon-gray truncate">{result.domain}</p>
                  {result.price && <p className="text-xs text-slate-gray mt-0.5">{result.price}</p>}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full",
                    result.available ? "bg-emerald-50 text-deep-emerald" : "bg-red-50 text-soft-coral"
                  )}
                >
                  {result.available ? "Disponible" : "No disponible"}
                </span>
              </div>
              <div>
                {result.available ? (
                  <Button
                    size="sm"
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                    iconPosition="right"
                    onClick={() => window.open("https://www.namecheap.com", "_blank")}
                  >
                    Registrar
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm">
                    Ver alternativas
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-4 bg-snow-gray rounded-xl border border-fog-gray mt-6">
            <AlertCircle className="h-4 w-4 text-slate-gray shrink-0 mt-0.5" />
            <p className="text-xs text-slate-gray">
              Da Vinci Inventa recibe una comisión por referencias al proveedor de dominios. Los precios son indicativos y pueden variar.
            </p>
          </div>
        </div>
      )}

      {/* Search History */}
      {!results && !loading && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-carbon-gray mb-4">Búsquedas Recientes</h3>
          {history.length === 0 && (
            <EmptyState size="sm" title="No hay búsquedas recientes." />
          )}
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white border border-fog-gray rounded-xl px-5 py-3 hover:bg-snow-gray transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Globe className={cn("h-4 w-4", item.available ? "text-deep-emerald" : "text-slate-gray")} />
                  <div>
                    <p className="font-mono text-sm font-medium text-carbon-gray">{item.domain}</p>
                    <p className="text-xs text-slate-gray flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(item.searchedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      item.available ? "bg-emerald-50 text-deep-emerald" : "bg-red-50 text-soft-coral"
                    )}
                  >
                    {item.available ? "Disponible" : "No disponible"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setQuery(item.domain.replace(/\.\w+$/, "")); }}
                >
                  Buscar nuevamente
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
