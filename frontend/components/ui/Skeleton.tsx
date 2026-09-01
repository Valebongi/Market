import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-fog-gray rounded-lg",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        "before:animate-shimmer before:translate-x-[-100%]",
        className
      )}
    />
  );
}

export function AssetCardSkeleton() {
  return (
    <div className="bg-white border border-fog-gray rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

/*
 * `StatCardSkeleton` y `TableRowSkeleton` se borraron: ningún `loading.tsx` ni
 * estado de carga los importaba. Las pantallas con tablas (`admin/users`,
 * `admin/assets`, `dashboard/assets`) muestran un spinner o un `EmptyState`
 * mientras cargan, no un esqueleto de filas.
 *
 * Los que SÍ están en uso son `Skeleton` y `AssetCardSkeleton`, que alimentan
 * los `loading.tsx` de `(public)/assets`, `(public)/assets/[id]` y
 * `dashboard/explore`. Si vuelve a hacer falta un esqueleto de tabla,
 * reconstruirlo sobre `<Skeleton>` es más corto que mantener uno sin usar.
 */
