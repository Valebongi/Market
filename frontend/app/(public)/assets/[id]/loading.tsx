import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton propio del detalle.
 *
 * Existe para que `assets/loading.tsx` no se cuele acá: sin este archivo, entrar
 * a la ficha de un activo desde fuera del catálogo mostraría la grilla de
 * tarjetas del listado como estado de carga de una página que no es una grilla.
 */
export default function AssetDetailLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <div className="container-market py-8">
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
