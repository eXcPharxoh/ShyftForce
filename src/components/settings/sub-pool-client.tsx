"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Plus, X } from "lucide-react";
import { CsvImportButton } from "@/components/ui/csv-import-button";

const SAMPLE_CSV = `email,subjects,grades,hourlyRate
alex@school.edu,Math|Science,6|7|8,35
jordan@school.edu,English,9|10|11|12,38
casey@school.edu,Art|Music,K|1|2|3|4|5,32`;

type Sub = {
  id: string; memberId: string; name: string; email: string;
  subjects: string[]; grades: string[];
  hourlyRateCents: number; isActive: boolean;
  preferredContactHour: number | null; latestContactHour: number | null;
};

const SUBJECTS = ["Math", "Science", "English", "History", "Art", "Music", "PE", "Foreign Lang", "Computer Sci", "Special Ed"];
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export function SubPoolClient({ initial, availableMembers }: { initial: Sub[]; availableMembers: { id: string; name: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [hourlyRate, setHourlyRate] = useState(35);
  const [pickedSubjects, setPickedSubjects] = useState<string[]>([]);
  const [pickedGrades, setPickedGrades] = useState<string[]>([]);
  const [preferredHour, setPreferredHour] = useState<number | "">(6);
  const [latestHour, setLatestHour] = useState<number | "">(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/sub-pool", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId, hourlyRateCents: Math.round(hourlyRate * 100),
        subjects: pickedSubjects, grades: pickedGrades,
        preferredContactHour: preferredHour === "" ? null : Number(preferredHour),
        latestContactHour: latestHour === "" ? null : Number(latestHour),
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setMemberId(""); setPickedSubjects([]); setPickedGrades([]); r.refresh();
  }

  function toggleSubject(s: string) {
    setPickedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function toggleGrade(g: string) {
    setPickedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <CsvImportButton
          endpoint="/api/import/sub-pool"
          label="Import CSV"
          title="Bulk-import substitute teachers"
          sampleCsv={SAMPLE_CSV}
        />
        <button onClick={() => setOpen(true)} className="btn-primary text-sm" disabled={availableMembers.length === 0}>
          <Plus className="w-4 h-4" /> Add to pool
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No subs in pool</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map(s => (
            <li key={s.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {s.name}
                  {!s.isActive && <span className="ml-2 text-[10px] text-rose-600 uppercase font-semibold">Inactive</span>}
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  ${(s.hourlyRateCents / 100).toFixed(2)}/hr
                  {s.preferredContactHour !== null && s.latestContactHour !== null && ` · Contact ${s.preferredContactHour}:00–${s.latestContactHour}:00`}
                </div>
                <div className="text-[11px] text-ink-500">
                  {s.subjects.length > 0 && `Subjects: ${s.subjects.join(", ")}`}
                  {s.grades.length > 0 && ` · Grades: ${s.grades.join(", ")}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Add to sub pool</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="label">Member</label>
                <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
                  <option value="">Pick a member…</option>
                  {availableMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hourly rate ($)</label>
                <input className="input" type="number" min={0} max={500} value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Subjects</label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSubject(s)}
                      className={`px-2 py-1 rounded-full text-[11px] border ${pickedSubjects.includes(s) ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40" : "border-ink-200 dark:border-ink-700"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Grades</label>
                <div className="flex flex-wrap gap-1.5">
                  {GRADES.map(g => (
                    <button key={g} type="button" onClick={() => toggleGrade(g)}
                      className={`w-9 h-9 rounded-lg text-[11px] border font-semibold ${pickedGrades.includes(g) ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40" : "border-ink-200 dark:border-ink-700"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contact from (h)</label>
                  <input className="input" type="number" min={0} max={23} value={preferredHour} onChange={(e) => setPreferredHour(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Contact until (h)</label>
                  <input className="input" type="number" min={0} max={23} value={latestHour} onChange={(e) => setLatestHour(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
