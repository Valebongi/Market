export default function RequestsLoading() {
  return (
    <div className="p-8 max-w-wide mx-auto animate-pulse">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray dark:border-white/10">
        <div className="h-9 w-44 bg-fog-gray dark:bg-white/10 rounded-lg" />
        <div className="h-5 w-72 bg-fog-gray dark:bg-white/10 rounded-md mt-2" />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 bg-fog-gray dark:bg-white/10 rounded-lg" />
        ))}
      </div>

      {/* Request cards */}
      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-fog-gray dark:bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="h-4 w-full bg-fog-gray dark:bg-white/10 rounded-md" />
              <div className="h-4 w-2/3 bg-fog-gray dark:bg-white/10 rounded-md" />
            </div>
            <div className="h-6 w-20 bg-fog-gray dark:bg-white/10 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
