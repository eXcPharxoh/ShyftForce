/**
 * Lightweight skeleton shown while the dashboard's data queries fetch.
 * Replaces the blank-flash with placeholders that match the real layout's
 * shape, so the page feels faster even before any data arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-white/[0.05] rounded w-1/3" />
      <div className="card p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-white/[0.03]">
              <div className="h-3 w-16 bg-white/[0.05] rounded mb-2" />
              <div className="h-6 w-20 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5 h-48 bg-white/[0.02]" />
        <div className="card p-5 h-48 bg-white/[0.02]" />
      </div>
    </div>
  );
}
