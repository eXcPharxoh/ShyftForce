export function SurveyProgress({ responses, total, title }: { responses: number; total: number; title: string }) {
  const pct = total > 0 ? Math.round((responses / total) * 1000) / 10 : 0;
  const dash = (pct / 100) * 264;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="10" fill="none" />
          <circle cx="50" cy="50" r="42" stroke="#f97316" strokeWidth="10" fill="none"
            strokeDasharray={`${dash} 264`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold tabular-nums">{pct}%</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-800 dark:text-ink-200 line-clamp-2">{title}</div>
        <div className="text-xs text-ink-500 mt-1">{responses} / {total} responses</div>
        <div className="badge-orange mt-2">Ready to analyze</div>
      </div>
    </div>
  );
}
