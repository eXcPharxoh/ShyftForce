/**
 * Attendance page skeleton. The actual page fetches attendance logs +
 * clock-in status + a punch map + a pretty large data table — the
 * blank flash on first paint is noticeable. Mirror the layout shape.
 */
export default function AttendanceLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <header>
        <div className="h-3 w-32 bg-white/[0.06] rounded mb-2" />
        <div className="h-7 w-48 bg-white/[0.08] rounded" />
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-16 bg-white/[0.06] rounded" />
            <div className="h-7 w-12 bg-white/[0.08] rounded mt-3" />
          </div>
        ))}
      </div>

      {/* Map card */}
      <div className="card h-72 bg-white/[0.02]" />

      {/* Table */}
      <div className="card p-4">
        <div className="h-4 w-40 bg-white/[0.06] rounded mb-3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-t border-white/[0.04] first:border-t-0">
            <div className="w-7 h-7 rounded-full bg-white/[0.06]" />
            <div className="flex-1 h-3 bg-white/[0.04] rounded" />
            <div className="w-12 h-3 bg-white/[0.06] rounded" />
            <div className="w-16 h-5 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
