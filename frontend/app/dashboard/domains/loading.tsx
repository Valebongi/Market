export default function DomainsLoading() {
  return (
    <div className="p-8 max-w-wide mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-fog-gray dark:border-white/10">
        <div>
          <div className="h-9 w-36 bg-fog-gray dark:bg-white/10 rounded-lg" />
          <div className="h-5 w-64 bg-fog-gray dark:bg-white/10 rounded-md mt-2" />
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-6 flex gap-3">
        <div className="h-12 flex-1 bg-fog-gray dark:bg-white/10 rounded-xl" />
        <div className="h-12 w-36 bg-fog-gray dark:bg-white/10 rounded-xl" />
      </div>

      {/* Result cards */}
      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-5 w-48 bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="h-4 w-32 bg-fog-gray dark:bg-white/10 rounded-md" />
            </div>
            <div className="h-9 w-24 bg-fog-gray dark:bg-white/10 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
