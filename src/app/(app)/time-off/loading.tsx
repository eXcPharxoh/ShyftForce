/**
 * Time-off page skeleton — PTO balances + a request list + the submit
 * form on the right.
 */
export default function TimeOffLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <header>
        <div className="h-3 w-28 bg-white/[0.06] rounded mb-2" />
        <div className="h-7 w-32 bg-white/[0.08] rounded" />
      </header>

      {/* PTO balance card */}
      <div className="card p-4">
        <div className="h-4 w-32 bg-white/[0.06] rounded mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-white/[0.03] p-3">
              <div className="h-3 w-14 bg-white/[0.06] rounded mb-2" />
              <div className="h-6 w-20 bg-white/[0.08] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary + requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-3">
                <div className="h-7 w-10 bg-white/[0.08] rounded" />
                <div className="h-3 w-14 bg-white/[0.06] rounded mt-2" />
              </div>
            ))}
          </div>
          <div className="card p-4 h-64" />
        </div>
        <div className="card p-4 h-72" />
      </div>
    </div>
  );
}
