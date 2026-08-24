export default function AssetsLoading() {
  return (
    <div className="p-8 max-w-wide mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-fog-gray dark:border-white/10">
        <div>
          <div className="h-9 w-40 bg-fog-gray dark:bg-white/10 rounded-lg" />
          <div className="h-5 w-64 bg-fog-gray dark:bg-white/10 rounded-md mt-2" />
        </div>
        <div className="h-10 w-36 bg-fog-gray dark:bg-white/10 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex gap-3">
        <div className="h-10 flex-1 bg-fog-gray dark:bg-white/10 rounded-lg" />
        <div className="h-10 w-32 bg-fog-gray dark:bg-white/10 rounded-lg" />
      </div>

      {/* Asset grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl overflow-hidden"
          >
            <div className="h-40 bg-fog-gray dark:bg-white/10" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="h-4 w-full bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="h-4 w-1/2 bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="flex items-center justify-between mt-3">
                <div className="h-6 w-16 bg-fog-gray dark:bg-white/10 rounded-full" />
                <div className="h-6 w-20 bg-fog-gray dark:bg-white/10 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
