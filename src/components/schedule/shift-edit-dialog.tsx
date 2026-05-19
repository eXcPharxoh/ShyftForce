"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Save, Loader2, Send, Users, AlertOctagon, AlertTriangle, ShieldCheck, DollarSign } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export type VerticalOptions = {
  industry: string | null;
  departments: { id: string; name: string; color: string }[];
  crews:       { id: string; name: string; color: string }[];
  periods:     { id: string; number: number; name: string | null; startTime: string; endTime: string }[];
};

export type ShiftEditPayload = {
  id: string;
  memberId: string | null;
  memberName: string | null;
  locationId: string;
  locationName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  position: string;
  notes: string | null;
  status: "draft" | "published";
  isOpen: boolean;
  // Vertical-specific (all optional)
  departmentId?:      string | null;
  crewId?:            string | null;
  classPeriodId?:     string | null;
  modMemberId?:       string | null;
  unit?:              string | null;
  requiredSkillTier?: number | null;
};

// Healthcare unit options
const UNITS = [
  { v: "med_surg",   l: "Med-surg" },
  { v: "icu",        l: "ICU / Critical care" },
  { v: "step_down",  l: "Step-down / Telemetry" },
  { v: "ed",         l: "Emergency department" },
  { v: "psych",      l: "Psychiatric" },
  { v: "labor",      l: "Labor & delivery" },
  { v: "pacu",       l: "Post-anesthesia (PACU)" },
  { v: "lt_care",    l: "Long-term care" },
];

type Violation = { rule: string; ruleLabel: string; severity: "error" | "warning"; message: string; recommendation?: string };
type Predictability = { triggered: boolean; bracketLabel?: string; noticeHours: number; hoursOwed: number; hourlyRate: number; amountOwedCents: number };

export function ShiftEditDialog({
  shift, members, verticals, onClose,
}: {
  shift: ShiftEditPayload;
  members: { id: string; name: string }[];
  verticals?: VerticalOptions;
  onClose: () => void;
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [date, setDate] = useState(shift.date);
  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [position, setPosition] = useState(shift.position ?? "");
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [memberId, setMemberId] = useState<string | "open">(shift.isOpen ? "open" : (shift.memberId ?? ""));
  const [status, setStatus] = useState<"draft" | "published">(shift.status);
  // Vertical-specific
  const [departmentId, setDepartmentId]     = useState<string>(shift.departmentId  ?? "");
  const [crewId, setCrewId]                 = useState<string>(shift.crewId        ?? "");
  const [classPeriodId, setClassPeriodId]   = useState<string>(shift.classPeriodId ?? "");
  const [modMemberId, setModMemberId]       = useState<string>(shift.modMemberId   ?? "");
  const [unit, setUnit]                     = useState<string>(shift.unit          ?? "");
  const [requiredSkillTier, setRequiredSkillTier] = useState<number | "">(shift.requiredSkillTier ?? "");
  const [saving, setSaving] = useState<"save" | "delete" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live compliance check
  const [violations, setViolations] = useState<Violation[]>([]);
  const [predictability, setPredictability] = useState<Predictability | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (memberId === "open" || !memberId) { setViolations([]); setPredictability(null); return; }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const startsAt = combineISO(date, startTime);
        const endsAt   = combineISO(date, endTime);
        const isMoved = (startsAt !== combineISO(shift.date, shift.startTime)) || (endsAt !== combineISO(shift.date, shift.endTime));
        const changeType = shift.status === "published"
          ? (memberId !== shift.memberId ? "canceled" : isMoved ? "moved" : null)
          : null;
        const res = await fetch("/api/compliance/check-shift", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shift: { id: shift.id, memberId, startsAt, endsAt, status },
            originalShift: { startsAt: combineISO(shift.date, shift.startTime), endsAt: combineISO(shift.date, shift.endTime), status: shift.status },
            changeType,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          setViolations(d.violations ?? []);
          setPredictability(d.predictability ?? null);
        }
      } finally { setChecking(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [date, startTime, endTime, memberId, status, shift.id, shift.date, shift.startTime, shift.endTime, shift.memberId, shift.status]);

  const errors = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");

  async function save(opts?: { publishToo?: boolean }) {
    if (errors.length > 0) {
      const ok = await confirm({
        title: `${errors.length} compliance error${errors.length === 1 ? "" : "s"}`,
        description: "Save this shift anyway? You'll see these violations on the Compliance page.",
        tone: "danger",
        confirmLabel: "Save anyway",
      });
      if (!ok) return;
    }
    setSaving(opts?.publishToo ? "publish" : "save"); setError(null);
    const body: any = {
      date, startTime, endTime,
      position: position || null,
      notes: notes || null,
      status: opts?.publishToo ? "published" : status,
      memberId: memberId === "open" ? null : (memberId || null),
      isOpen: memberId === "open",
      // Vertical-specific (only included when verticals prop is provided so
      // we don't accidentally clear them via stale state)
      ...(verticals ? {
        departmentId:      departmentId  || null,
        crewId:            crewId        || null,
        classPeriodId:     classPeriodId || null,
        modMemberId:       modMemberId   || null,
        unit:              unit          || null,
        requiredSkillTier: requiredSkillTier === "" ? null : Number(requiredSkillTier),
      } : {}),
    };
    const res = await fetch(`/api/shifts/${shift.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Save failed"); return; }
    onClose(); r.refresh();
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this shift?",
      description: "This cannot be undone. If the shift was published inside the predictability-pay window, the system will record the cancellation.",
      tone: "danger",
      confirmLabel: "Delete shift",
    });
    if (!ok) return;
    setSaving("delete"); setError(null);
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    setSaving(null);
    if (!res.ok) { setError("Delete failed"); return; }
    onClose(); r.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
          <div>
            <div className="font-semibold text-sm">Edit shift</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">{shift.locationName}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 space-y-3 overflow-y-auto scroll-thin">
          <div>
            <label className="label">Assigned to</label>
            <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value as any)}>
              <option value="open">🟠 Leave as open shift</option>
              <optgroup label="Members">
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start time</label>
              <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="label">End time</label>
              <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Position</label>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Server, Security Officer…" />
          </div>

          {/* Vertical-specific fields — only render the ones relevant to the industry */}
          {verticals && (
            <div className="border-t border-ink-100 dark:border-ink-800 pt-3 space-y-3">
              {(verticals.industry === "grocery" || verticals.industry === "retail") && verticals.departments.length > 0 && (
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">— No department —</option>
                    {verticals.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {verticals.industry === "construction" && verticals.crews.length > 0 && (
                <div>
                  <label className="label">Crew</label>
                  <select className="input" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
                    <option value="">— No crew —</option>
                    {verticals.crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {verticals.industry === "education" && verticals.periods.length > 0 && (
                <div>
                  <label className="label">Class period (bell)</label>
                  <select className="input" value={classPeriodId} onChange={(e) => setClassPeriodId(e.target.value)}>
                    <option value="">— Not tied to a period —</option>
                    {verticals.periods.map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name ?? ""} ({p.startTime}–{p.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {verticals.industry === "hospitality" && (
                <div>
                  <label className="label">Manager on Duty for this block</label>
                  <select className="input" value={modMemberId} onChange={(e) => setModMemberId(e.target.value)}>
                    <option value="">— No MOD assigned —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              {verticals.industry === "healthcare" && (
                <div>
                  <label className="label">Unit (patient-ratio enforcement)</label>
                  <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="">— Not a clinical unit —</option>
                    {UNITS.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
                  </select>
                </div>
              )}
              {verticals.industry === "field_service" && (
                <div>
                  <label className="label">Required skill tier (1–5; blank = any)</label>
                  <input
                    className="input" type="number" min={1} max={5}
                    value={requiredSkillTier}
                    onChange={(e) => setRequiredSkillTier(e.target.value === "" ? "" : parseInt(e.target.value))}
                    placeholder="Leave blank to allow any tech"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input min-h-[68px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">Status:</span>
            <button onClick={() => setStatus("draft")} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${status === "draft" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"}`}>Draft</button>
            <button onClick={() => setStatus("published")} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${status === "published" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"}`}>Published</button>
          </div>

          {/* Live compliance feedback */}
          <div className="pt-2 border-t border-ink-100 dark:border-ink-800">
            <div className="flex items-center gap-1.5 mb-2">
              {checking
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-400" />
                : violations.length === 0 && !predictability?.triggered
                  ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">Compliance check</span>
            </div>
            {!checking && violations.length === 0 && !predictability?.triggered && memberId !== "open" && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">All clear — no violations or predictability pay triggered.</div>
            )}
            {predictability?.triggered && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-2.5 mb-2">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">
                      Predictability pay will be owed: ${(predictability.amountOwedCents / 100).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      {predictability.bracketLabel} · {predictability.hoursOwed.toFixed(2)}h × ${predictability.hourlyRate.toFixed(2)}/h
                    </div>
                  </div>
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <ul className="space-y-1 mb-2">
                {errors.map((v, i) => (
                  <li key={i} className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-2 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300 shrink-0 mt-px" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-rose-900 dark:text-rose-200">{v.ruleLabel}</div>
                        <div className="text-rose-700 dark:text-rose-300">{v.message}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {warnings.length > 0 && (
              <ul className="space-y-1">
                {warnings.map((v, i) => (
                  <li key={i} className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-2 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0 mt-px" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-amber-900 dark:text-amber-200">{v.ruleLabel}</div>
                        <div className="text-amber-800 dark:text-amber-300">{v.message}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
        </div>

        <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-between shrink-0">
          <button onClick={remove} disabled={!!saving} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
            {saving === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            {status === "draft" && (
              <button onClick={() => save({ publishToo: true })} disabled={!!saving} className="btn-outline">
                {saving === "publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Save & publish
              </button>
            )}
            <button onClick={() => save()} disabled={!!saving} className="btn-primary">
              {saving === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function combineISO(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}
