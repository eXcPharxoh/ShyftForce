/**
 * Members page skeleton — header + table of N rows. The members query
 * can be slow on orgs with hundreds of members so the skeleton keeps
 * the page feeling responsive.
 */
export default function MembersLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
          <div className="h-7 w-32 bg-white/[0.08] rounded" />
          <div className="h-3 w-48 bg-white/[0.04] rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-white/[0.06] rounded-lg" />
          <div className="h-9 w-28 bg-white/[0.06] rounded-lg" />
          <div className="h-9 w-28 bg-white/[0.06] rounded-lg" />
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="bg-white/[0.02] px-4 py-2.5 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-white/[0.06] rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 border-t border-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-white/[0.08] rounded" />
              <div className="h-2.5 w-40 bg-white/[0.04] rounded" />
            </div>
            <div className="w-20 h-3 bg-white/[0.06] rounded" />
            <div className="w-16 h-5 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
