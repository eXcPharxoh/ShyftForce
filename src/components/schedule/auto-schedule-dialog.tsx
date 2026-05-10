"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2, Wand2, AlertTriangle, CheckCircle2, ChevronLeft } from "lucide-react";
import { addDays, dateLabel, fmtHours, startOfWeek } from "@/lib/utils";

type Loc = { id: string; name: string };
type Coverage = { locationId: string; morning: number; afternoon: number; overnight: number };
type ProposedShift = {
  memberId: string;
  memberName: string | null;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  rationale?: string;
};
type Proposal = {
  weekStart: string;
  summary: string;
  warnings: string[];
  shifts: ProposedShift[];
  stats: { totalShifts: number; openShifts: number; hours: number };
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AutoScheduleDialog({
  open, onClose, locations,
}: { open: boolean; onClose: () => void; locations: Loc[] }) {
  const r = useRouter();
  const [step, setStep] = useState<"config" | "loading" | "review" | "saving" | "error">("config");
  const [error, setError] = useState<string | null>(null);

  // Config
  const nextWeek = useMemo(() => addDays(startOfWeek(new Date()), 7).toISOString().slice(0,10), []);
  const [weekStart, setWeekStart] = useState(nextWeek);
  const [maxHours, setMaxHours] = useState(40);
  const [notes, setNotes] = useState("");
  const [coverage, setCoverage] = useState<Coverage[]>(
    locations.map(l => ({ locationId: l.id, morning: 2, afternoon: 2, overnight: 1 }))
  );
  const setCov = (locId: string, key: "morning" | "afternoon" | "overnight", val: number) =>
    setCoverage(c => c.map(row => row.locationId === locId ? { ...row, [key]: Math.max(0, val) } : row));

  // Proposal
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [violations, setViolations] = useState<{ rule: string; ruleLabel: string; severity: "error" | "warning"; message: string; recommendation?: string }[]>([]);

  useEffect(() => { if (!open) { setStep("config"); setError(null); setProposal(null); setExcluded(new Set()); setViolations([]); } }, [open]);

  // Run compliance check whenever proposal or exclusions change
  useEffect(() => {
    if (!proposal) return;
    const ctrl = new AbortController();
    const shifts = proposal.shifts
      .filter((_, i) => !excluded.has(i))
      .map(s => ({ memberId: s.memberId || null, date: s.date, startTime: s.startTime, endTime: s.endTime }));
    fetch("/api/compliance/check-proposal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shifts }), signal: ctrl.signal,
    }).then(r => r.json()).then(d => setViolations(d.violations ?? [])).catch(() => {});
    return () => ctrl.abort();
  }, [proposal, excluded]);

  async function generate() {
    setStep("loading"); setError(null);
    try {
      const res = await fetch("/api/schedule/auto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, coverage, maxHoursPerWeek: maxHours, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to generate"); setStep("error"); return; }
      setProposal(data); setStep("review");
    } catch (e: any) { setError(e.message ?? "Network error"); setStep("error"); }
  }

  async function accept(publish: boolean) {
    if (!proposal) return;
    setStep("saving");
    const shifts = proposal.shifts
      .filter((_, i) => !excluded.has(i))
      .map(s => ({ memberId: s.memberId || null, locationId: s.locationId, date: s.date, startTime: s.startTime, endTime: s.endTime, position: s.position }));
    const res = await fetch("/api/schedule/bulk-create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shifts, publish }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setStep("error"); return; }
    onClose(); r.refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4 animate-fade-in">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-none">AI Auto-Scheduler</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Generate a full week from your rules</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {step === "config" && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Week starting (Monday)</label>
                  <input className="input" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
                </div>
                <div>
                  <label className="label">Max hours per employee</label>
                  <input className="input" type="number" min={1} max={80} value={maxHours} onChange={(e) => setMaxHours(parseInt(e.target.value, 10) || 40)} />
                </div>
              </div>

              <div>
                <label className="label">Coverage requirements per location</label>
                <div className="border border-ink-200 dark:border-ink-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 dark:bg-ink-800/60 text-[11px] uppercase text-ink-600 dark:text-ink-400 font-semibold tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2.5">Location</th>
                        <th className="text-center px-3 py-2.5">Morning<br/><span className="font-medium text-ink-500 dark:text-ink-500 normal-case tracking-normal">06–14</span></th>
                        <th className="text-center px-3 py-2.5">Afternoon<br/><span className="font-medium text-ink-500 dark:text-ink-500 normal-case tracking-normal">14–22</span></th>
                        <th className="text-center px-3 py-2.5">Overnight<br/><span className="font-medium text-ink-500 dark:text-ink-500 normal-case tracking-normal">22–06</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((l, i) => {
                        const c = coverage.find(c => c.locationId === l.id)!;
                        return (
                          <tr key={l.id} className={i > 0 ? "border-t border-ink-100 dark:border-ink-800" : ""}>
                            <td className="px-3 py-2.5 font-semibold text-ink-900 dark:text-ink-100">{l.name}</td>
                            <td className="px-3 py-2.5 text-center"><CovInput v={c.morning}   onChange={v => setCov(l.id, "morning", v)} /></td>
                            <td className="px-3 py-2.5 text-center"><CovInput v={c.afternoon} onChange={v => setCov(l.id, "afternoon", v)} /></td>
                            <td className="px-3 py-2.5 text-center"><CovInput v={c.overnight} onChange={v => setCov(l.id, "overnight", v)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1.5">Each number = how many people you need on that block, every day of the week.</p>
              </div>

              <div>
                <label className="label">Extra guidance (optional)</label>
                <textarea
                  className="input min-h-[68px]"
                  placeholder='e.g. "Keep weekends light. No employee works more than 4 days in a row. Sarah only does mornings."'
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 p-3.5 text-xs text-brand-900 dark:text-brand-200">
                <div className="font-semibold flex items-center gap-1.5 mb-1.5"><Sparkles className="w-3.5 h-3.5" /> What the AI considers</div>
                <ul className="space-y-1 text-brand-800 dark:text-brand-300/90 leading-relaxed">
                  <li>• Approved time-off · existing shifts · max-hours rule · 8h rest gap</li>
                  <li>• Last week's patterns · home location · position match · fair distribution</li>
                  <li>• Marks slots it can't fill as <b className="text-brand-900 dark:text-brand-200">open shifts</b> (won't invent people)</li>
                </ul>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center mb-4 animate-pulse shadow-soft">
                <Wand2 className="w-8 h-8" />
              </div>
              <div className="font-semibold">Building your schedule…</div>
              <div className="text-sm text-ink-500 dark:text-ink-400 mt-1">Reading availability, balancing hours, honoring time-off.</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400"><Loader2 className="w-4 h-4 animate-spin" /> Usually takes 10-25 seconds</div>
            </div>
          )}

          {step === "error" && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6" /></div>
              <div className="font-semibold">Couldn't generate</div>
              <p className="text-sm text-rose-600 dark:text-rose-400 mt-1 max-w-md mx-auto">{error}</p>
              <button onClick={() => setStep("config")} className="btn-outline mt-4"><ChevronLeft className="w-4 h-4" /> Back</button>
            </div>
          )}

          {step === "saving" && (
            <div className="p-12 flex flex-col items-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <div className="font-semibold mt-3">Saving shifts…</div>
            </div>
          )}

          {step === "review" && proposal && (
            <ReviewView proposal={proposal} excluded={excluded} setExcluded={setExcluded} violations={violations} />
          )}
        </div>

        <footer className="border-t border-ink-200 dark:border-ink-800 p-4 flex items-center justify-between gap-3 shrink-0">
          {step === "config" && (
            <>
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={generate} className="btn-primary">
                <Sparkles className="w-4 h-4" /> Generate
              </button>
            </>
          )}
          {step === "review" && proposal && (
            <>
              <button onClick={() => setStep("config")} className="btn-ghost"><ChevronLeft className="w-4 h-4" /> Edit rules</button>
              <div className="flex items-center gap-2">
                <button onClick={() => accept(false)} className="btn-outline"><CheckCircle2 className="w-4 h-4" /> Save as drafts</button>
                <button onClick={() => accept(true)}  className="btn-primary"><Sparkles className="w-4 h-4" /> Save & publish</button>
              </div>
            </>
          )}
          {(step === "loading" || step === "saving" || step === "error") && (
            <button onClick={onClose} className="btn-ghost ml-auto">Close</button>
          )}
        </footer>
      </div>
    </div>
  );
}

function CovInput({ v, onChange }: { v: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={() => onChange(v - 1)} className="w-7 h-7 rounded-lg border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-300 font-semibold transition">−</button>
      <span className="w-8 text-center font-bold tabular-nums text-ink-900 dark:text-ink-100">{v}</span>
      <button onClick={() => onChange(v + 1)} className="w-7 h-7 rounded-lg border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-300 font-semibold transition">+</button>
    </div>
  );
}

function ReviewView({
  proposal, excluded, setExcluded, violations,
}: {
  proposal: Proposal;
  excluded: Set<number>;
  setExcluded: (s: Set<number>) => void;
  violations: { rule: string; ruleLabel: string; severity: "error" | "warning"; message: string; recommendation?: string }[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(proposal.weekStart), i));
  const byDay = new Map<string, { shift: ProposedShift; idx: number }[]>();
  proposal.shifts.forEach((s, idx) => {
    if (!byDay.has(s.date)) byDay.set(s.date, []);
    byDay.get(s.date)!.push({ shift: s, idx });
  });
  // sort each day's shifts by start time
  for (const arr of byDay.values()) arr.sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime));

  const toggle = (idx: number) => {
    const next = new Set(excluded);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExcluded(next);
  };

  const kept = proposal.shifts.length - excluded.size;
  const keptHours = proposal.shifts.reduce((a, s, i) => excluded.has(i) ? a : a + hoursBetween(s.startTime, s.endTime), 0);

  return (
    <div className="p-5 space-y-4">
      <div className="card p-4 bg-gradient-to-br from-brand-50 to-rose-50 dark:from-brand-500/10 dark:to-rose-500/10 border-brand-200 dark:border-brand-500/30">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white dark:bg-ink-900 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm"><Sparkles className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-ink-900 dark:text-ink-50">AI summary</div>
            <p className="text-sm text-ink-700 dark:text-ink-300 mt-0.5 leading-relaxed">{proposal.summary}</p>
            {proposal.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {proposal.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-500/15 rounded-md px-2 py-1 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Shifts kept"  value={kept}                        total={proposal.stats.totalShifts} />
        <Stat label="Hours"        value={`${keptHours.toFixed(0)}h`}  />
        <Stat label="Open shifts"  value={proposal.shifts.filter((s, i) => !s.memberId && !excluded.has(i)).length} tone={proposal.stats.openShifts > 0 ? "amber" : "emerald"} />
      </div>

      {violations.length > 0 && (
        <div className="card p-3 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <div className="font-semibold text-sm text-amber-900 dark:text-amber-200">Compliance check ({violations.length})</div>
          </div>
          <ul className="space-y-1 text-xs">
            {violations.slice(0, 5).map((v, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={v.severity === "error" ? "badge bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0" : "badge bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0"}>{v.ruleLabel}</span>
                <span className="flex-1 text-ink-800 dark:text-ink-200">{v.message}</span>
              </li>
            ))}
            {violations.length > 5 && <li className="text-[11px] text-ink-500 dark:text-ink-400 ml-1">+ {violations.length - 5} more — fix or save anyway</li>}
          </ul>
        </div>
      )}
      {violations.length === 0 && proposal && (
        <div className="card p-2.5 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[11px] font-bold">✓</span>
          <span>Compliance check passed — no violations on the kept shifts.</span>
        </div>
      )}

      <div className="space-y-2">
        {days.map((d, i) => {
          const key = d.toISOString().slice(0,10);
          const items = byDay.get(key) ?? [];
          return (
            <div key={key} className="border border-ink-200 dark:border-ink-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-ink-50 dark:bg-ink-800/60 flex items-center justify-between">
                <div className="font-semibold text-sm text-ink-900 dark:text-ink-100">{DAY_LABELS[i]} · {dateLabel(d)}</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">{items.length} shifts</div>
              </div>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {items.map(({ shift, idx }) => {
                  const isExcl = excluded.has(idx);
                  const isOpen = !shift.memberId;
                  return (
                    <li key={idx} className={`px-3 py-2 flex items-center gap-3 ${isExcl ? "bg-ink-50/60 dark:bg-ink-800/40 opacity-50" : ""}`}>
                      <input type="checkbox" checked={!isExcl} onChange={() => toggle(idx)} className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-ink-900 dark:text-ink-100">
                          {isOpen ? <span className="text-amber-700 dark:text-amber-300">Open shift</span> : shift.memberName}
                          <span className="text-ink-500 dark:text-ink-400"> · {shift.position}</span>
                        </div>
                        <div className="text-[11px] text-ink-500 dark:text-ink-400 truncate">{shift.locationName} · {shift.startTime}–{shift.endTime}{shift.rationale ? <span className="text-ink-400 dark:text-ink-500"> · {shift.rationale}</span> : null}</div>
                      </div>
                      <span className={isOpen ? "badge bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" : "badge bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"}>
                        {isOpen ? "open" : `${hoursBetween(shift.startTime, shift.endTime).toFixed(0)}h`}
                      </span>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="px-3 py-3 text-xs text-ink-500 dark:text-ink-400 italic">No shifts this day.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, total, tone = "ink" }: { label: string; value: number | string; total?: number; tone?: "ink" | "emerald" | "amber" }) {
  const map: any = {
    ink:     "text-ink-900 dark:text-ink-50",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber:   "text-amber-700 dark:text-amber-300",
  };
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-2.5">
      <div className={`text-xl font-bold ${map[tone]}`}>{value}{total != null && <span className="text-sm text-ink-400 dark:text-ink-500 font-normal"> / {total}</span>}</div>
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
    </div>
  );
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh*60 + em) - (sh*60 + sm);
  if (mins < 0) mins += 24*60;
  return mins / 60;
}
