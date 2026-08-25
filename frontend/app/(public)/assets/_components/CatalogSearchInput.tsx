"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { catalogHref, type CatalogParams } from "./catalog";

interface Props {
  /** Valor de `?search=` que ya renderizó el servidor. */
  value: string;
  /** Resto del estado del catálogo, para no perderlo al escribir. */
  params: CatalogParams;
}

/**
 * Buscador del catálogo.
 *
 * El listado se renderiza en el servidor; este input sólo traduce lo que se
 * tipea a una navegación con `?search=`. Mantiene el debounce de 500 ms que
 * tenía la versión cliente: sin él, cada tecla dispararía una petición al
 * servidor en vez de una llamada a la API.
 *
 * No usa `useSearchParams`: recibe el estado por props desde el Server
 * Component. Así el componente no necesita un `<Suspense>` alrededor y no hay
 * dos lecturas distintas de la misma URL.
 */
export default function CatalogSearchInput({ value, params }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);

  /**
   * Último término que YA está en la URL, siempre normalizado con `trim()`.
   * Sirve para tres cosas:
   * 1. no navegar al montar (el draft arranca igual al de la URL);
   * 2. no pisar lo que el usuario sigue tipeando cuando vuelve el render del
   *    servidor con el término anterior;
   * 3. cortar el bucle de navegación. Comparar contra el draft SIN normalizar
   *    hacía que tipear un espacio al final (draft "abc ", URL "abc") navegara,
   *    volviera con el mismo valor, y volviera a navegar. Para siempre.
   */
  const committed = useRef(value.trim());

  // La URL puede cambiar por fuera del input: una etiqueta del detalle
  // (`/assets?search=<tag>`), "Limpiar filtros", o el botón atrás. En esos
  // casos el input tiene que seguir a la URL.
  useEffect(() => {
    const incoming = value.trim();
    if (incoming === committed.current) return;
    committed.current = incoming;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const term = draft.trim();
    if (term === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = term;
      // Un término nuevo vuelve a la página 1: quedarse en la 4 de un
      // resultado que ahora tiene una sola página muestra un vacío falso.
      router.replace(
        catalogHref(params, { search: term || undefined, page: undefined }),
        { scroll: false },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, params, router]);

  return (
    <div className="relative">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar activos
      </label>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray dark:text-gray-500 pointer-events-none" />
      <input
        id="catalog-search"
        type="search"
        placeholder="Buscar activos..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full h-10 pl-10 pr-9 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-electric-blue dark:focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="Borrar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-gray hover:text-carbon-gray dark:hover:text-gray-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
