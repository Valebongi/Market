"use client";

import { useState, useEffect } from "react";
import { Search, Globe, ExternalLink, Clock, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { domainsApi } from "@/lib/api";

interface DomainResult {
  domain: string;
  available: boolean;
  price?: string;
  premium?: boolean;
}

interface SearchHistory {
  domain: string;
  available: boolean;
  searchedAt: string;
}

const EXTENSIONS = [".com", ".io", ".app", ".tech", ".co", ".dev"];

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const [selectedExts, setSelectedExts] = useState<string[]>([]);
  const [results, setResults] = useState<DomainResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);

  // Load search history on mount
  useEffect(() => {
    domainsApi.history()
      .then((data: any[]) => {
        const mapped: SearchHistory[] = (data || []).map((h) => ({
          domain: h.domainName || h.domain,
          available: h.available,
          searchedAt: h.searchedAt || h.createdAt,
        }));
        setHistory(mapped.slice(0, 10));
      })
      .catch(() => setHistory([]));
  }, []);

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
      const mapped: DomainResult[] = (res.results || []).map((r: any) => ({
        domain: r.domain,
        available: r.available,
        price: r.price,
      }));
      setResults(mapped);
      // Refresh history after search
      domainsApi.history()
        .then((data: any[]) => {
          const mapped2: SearchHistory[] = (data || []).map((h) => ({
            domain: h.domainName || h.domain,
            available: h.available,
            searchedAt: h.searchedAt || h.createdAt,
          }));
          setHistory(mapped2.slice(0, 10));
        })
        .catch(() => {});
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-standard mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Buscar Dominios</h1>
        <p className="text-base text-slate-gray mt-1">
          Encontrá el dominio perfecto para tu proyecto
        </p>
      </div>

      {/* Hero Search */}
      <div className="py-10">
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
              className="flex items-center justify-between bg-white border border-fog-gray rounded-xl px-5 py-4 hover:shadow-subtle transition-all"
            >
              <div className="flex items-center gap-4">
                <Globe className={cn("h-5 w-5 shrink-0", result.available ? "text-deep-emerald" : "text-slate-gray")} />
                <div>
                  <p className="font-mono font-semibold text-carbon-gray">{result.domain}</p>
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
            <p className="text-sm text-slate-gray">No hay búsquedas recientes.</p>
          )}
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.domain}
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
