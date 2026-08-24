import { AssetCardSkeleton } from "@/components/ui/Skeleton";

export default function ExploreLoading() {
  return (
    <div className="min-h-full bg-[#f0f4ff] dark:bg-[#0d1117]">
      <div className="p-4 sm:p-8 max-w-wide mx-auto">
        <div className="pb-6 sm:pb-8 border-b-2 border-blue-100 dark:border-white/10">
          <div className="h-8 w-64 bg-fog-gray dark:bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-fog-gray dark:bg-white/10 rounded animate-pulse mt-2" />
        </div>
        <div className="mt-6 sm:mt-8 flex gap-6 lg:gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-5 space-y-4">
              <div className="h-10 bg-fog-gray dark:bg-white/10 rounded-lg animate-pulse" />
              <div className="space-y-2 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 bg-fog-gray dark:bg-white/10 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
