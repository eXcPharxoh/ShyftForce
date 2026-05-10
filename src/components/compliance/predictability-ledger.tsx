"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, DollarSign, RotateCcw } from "lucide-react";

type Event = {
  id: string;
  memberName: string;
  locationName: string;
  changeType: string;
  occurredAt: string;
  shiftStartsAt: string;
  noticeHours: number;
  hoursOwed: number;
  hourlyRate: number;
  amountOwedCents: number;
  reason: string | null;
  resolvedAt?: string | null;
};

export function PredictabilityLedger({ events, totalOwedCents, byMember }: {
  events: Event[];
  totalOwedCents: number;
  byMember: { memberId: string; name: string; cents: number; events: number }[];
}) {
  const r = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(eventId: string, action: "resolve" | "unresolve") {
    setBusy(eventId);
    await fetch("/api/compliance/predictability", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: [eventId], action }),
    });
    setBusy(null);
    r.refresh();
  }

  if (events.length === 0) {
    return (
      <section className="card p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2">
          <DollarSign className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-sm">No predictability pay owed</h3>
        <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">
          Schedule changes inside the Fair Workweek lead window will appear here automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-300" /> Predictability pay owed
          </h3>
          <p className="text-[11px] text-ink-500 dark:text-ink-400">
            Auto-tracked when published shifts change inside the lead window. Mark as resolved when paid out (or surface to payroll).
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">${(totalOwedCents / 100).toFixed(2)}</div>
          <div className="text-[11px] text-ink-500 dark:text-ink-400">total owed across {events.length} events</div>
        </div>
      </header>

      {byMember.length > 0 && (
        <div className="px-5 py-2.5 border-b border-ink-100 dark:border-ink-800 bg-ink-50/40 dark:bg-ink-900/40 text-[11px] flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">Top members:</span>
          {byMember.slice(0, 5).map((m) => (
            <span key={m.memberId} className="badge-gray">
              {m.name} · ${(m.cents / 100).toFixed(2)}
            </span>
          ))}
        </div>
      )}

      <ul className="divide-y divide-ink-100 dark:divide-ink-800">
        {events.map((e) => (
          <li key={e.id} className="px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink-900 dark:text-ink-100">
                {e.memberName} · ${(e.amountOwedCents / 100).toFixed(2)}
              </div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400">
                {e.locationName} · {e.changeType} · {e.noticeHours.toFixed(1)}h notice → {e.hoursOwed}h pay × ${e.hourlyRate.toFixed(2)}/h
              </div>
              {e.reason && <div className="text-[10px] text-ink-400 dark:text-ink-500 italic mt-0.5">{e.reason}</div>}
            </div>
            <button
              onClick={() => resolve(e.id, "resolve")}
              disabled={busy === e.id}
              className="btn-outline text-xs"
            >
              {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Mark resolved
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
