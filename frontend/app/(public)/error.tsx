"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Error boundary de las rutas públicas.
 *
 * Las páginas públicas se renderizan en el servidor y consultan al gateway. Si
 * el gateway no responde (500, caído, red), preferimos propagar el error en vez
 * de fingir un 404: acá lo mostramos con un mensaje entendible y un reintento,
 * en lugar de la pantalla de error genérica de Next.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public] render error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-warm-amber" />
        <h1 className="mt-4 text-2xl font-bold text-carbon-gray dark:text-gray-100">
          No pudimos cargar esta página
        </h1>
        <p className="mt-2 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">
          Hubo un problema temporal al conectarnos con el servidor. Probá de
          nuevo en unos segundos.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-11 px-5 rounded-lg bg-electric-blue text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Reintentar
          </button>
          <Link
            href="/assets"
            className="h-11 px-5 inline-flex items-center rounded-lg border border-fog-gray dark:border-white/10 text-sm font-medium text-carbon-gray dark:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
          >
            Explorar activos
          </Link>
        </div>
      </div>
    </div>
  );
}
