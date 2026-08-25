import { AssetCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

/**
 * Feedback mientras el servidor arma el catálogo.
 *
 * Con el listado en cliente el skeleton lo pintaba el propio componente. Ahora
 * la página es SSR: entre el clic en un filtro y la respuesta del servidor no
 * habría ningún indicio de que algo está pasando. Este boundary lo cubre.
 */
export default function AssetsLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <div className="border-b border-fog-gray dark:border-white/10">
        <div className="container-market py-8 space-y-3">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>

      <div className="container-market py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-72 shrink-0">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-40 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <AssetCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
