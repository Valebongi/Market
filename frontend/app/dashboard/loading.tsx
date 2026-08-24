export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-wide mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between pb-8 border-b border-fog-gray dark:border-white/10">
        <div className="space-y-2">
          <div className="h-9 w-52 bg-fog-gray dark:bg-white/10 rounded-lg" />
          <div className="h-5 w-44 bg-fog-gray dark:bg-white/10 rounded-md" />
        </div>
        <div className="h-4 w-40 bg-fog-gray dark:bg-white/10 rounded-md hidden sm:block" />
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-fog-gray dark:bg-white/5 rounded-xl border border-fog-gray dark:border-white/10" />
        ))}
      </div>

      {/* Quick Actions heading */}
      <div className="mt-12 mb-6 h-6 w-40 bg-fog-gray dark:bg-white/10 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-fog-gray dark:bg-white/5 rounded-xl border border-fog-gray dark:border-white/10" />
        ))}
      </div>

      {/* Activity heading */}
      <div className="mt-12 mb-6 flex items-center justify-between">
        <div className="h-6 w-44 bg-fog-gray dark:bg-white/10 rounded-md" />
        <div className="h-4 w-28 bg-fog-gray dark:bg-white/10 rounded-md" />
      </div>
      <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 ${i !== 3 ? "border-b border-fog-gray dark:border-white/10" : ""}`}
          >
            <div className="w-9 h-9 rounded-full bg-fog-gray dark:bg-white/10 shrink-0" />
            <div className="flex-1 h-4 bg-fog-gray dark:bg-white/10 rounded-md" />
            <div className="w-20 h-3 bg-fog-gray dark:bg-white/10 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
