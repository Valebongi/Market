"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Contenedor del sidebar de filtros.
 *
 * Los filtros los renderiza el SERVIDOR y llegan acá por `children`: este
 * componente sólo decide si el panel se ve o no en mobile. Es deliberado —
 * si los filtros vivieran dentro del cliente, los enlaces de categoría
 * desaparecerían del HTML servido, que es justo lo que había que arreglar.
 *
 * En mobile el panel arranca colapsado con `hidden` (sigue en el HTML, sólo
 * que sin pintar). El botón "Filtros" de la versión anterior no tenía `onClick`
 * y no hacía absolutamente nada.
 */
export default function CatalogFilterPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="catalog-filters"
        className="lg:hidden w-full flex items-center justify-center gap-2 text-sm font-medium text-carbon-gray dark:text-gray-300 border border-fog-gray dark:border-white/10 rounded-lg px-3 py-2.5 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {open ? "Ocultar filtros" : "Filtros"}
      </button>

      <div
        id="catalog-filters"
        className={cn(
          "mt-3 lg:mt-0 lg:sticky lg:top-24 bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 space-y-6",
          open ? "block" : "hidden lg:block",
        )}
      >
        {children}
      </div>
    </aside>
  );
}
