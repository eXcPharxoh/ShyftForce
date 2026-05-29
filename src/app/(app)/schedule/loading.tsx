/** Schedule grid skeleton — same shape as the real page so layout doesn't jump. */
export default function ScheduleLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 bg-white/[0.05] rounded w-1/3" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-44 bg-white/[0.05] rounded" />
        <div className="h-9 w-32 bg-white/[0.05] rounded" />
      </div>
      <div className="card p-2 hidden lg:block">
        <div className="h-[420px] bg-white/[0.03] rounded" />
      </div>
      <div className="lg:hidden space-y-2">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-5 w-40 bg-white/[0.05] rounded mb-3" />
            <div className="h-8 bg-white/[0.03] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
