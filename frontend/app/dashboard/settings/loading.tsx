export default function SettingsLoading() {
  return (
    <div className="p-8 max-w-wide mx-auto animate-pulse">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray dark:border-white/10">
        <div className="h-9 w-44 bg-fog-gray dark:bg-white/10 rounded-lg" />
        <div className="h-5 w-72 bg-fog-gray dark:bg-white/10 rounded-md mt-2" />
      </div>

      {/* Sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="mt-8 bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 space-y-4">
          <div className="h-6 w-36 bg-fog-gray dark:bg-white/10 rounded-md" />
          <div className="h-10 w-full bg-fog-gray dark:bg-white/10 rounded-lg" />
          <div className="h-10 w-full bg-fog-gray dark:bg-white/10 rounded-lg" />
          <div className="h-10 w-32 bg-fog-gray dark:bg-white/10 rounded-lg mt-2" />
        </div>
      ))}
    </div>
  );
}
