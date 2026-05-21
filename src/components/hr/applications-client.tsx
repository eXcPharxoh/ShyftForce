"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Mail, Phone, Calendar, Loader2, Check, X, FileText,
  ChevronRight, UserPlus,
} from "lucide-react";

type App = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resumeText: string | null;
  coverLetter: string | null;
  source: string | null;
  status: "new" | "screen" | "interview" | "offer" | "hired" | "rejected";
  reviewerName: string | null;
  notes: string | null;
  appliedAt: string;
  hiredAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  invitationId: string | null;
};

const STAGES = [
  { key: "new",       label: "New",       cls: "status-info"    },
  { key: "screen",    label: "Screen",    cls: "status-info"    },
  { key: "interview", label: "Interview", cls: "status-warn"    },
  { key: "offer",     label: "Offer",     cls: "status-warn"    },
  { key: "hired",     label: "Hired",     cls: "status-success" },
  { key: "rejected",  label: "Rejected",  cls: "status-danger"  },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export function ApplicationsClient({
  postingId, defaultPosition, defaultLocationId,
  initial, locations, initialStage,
}: {
  postingId: string;
  defaultPosition: string | null;
  defaultLocationId: string | null;
  initial: App[];
  locations: { id: string; name: string }[];
  initialStage?: string;
}) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [stage, setStage] = useState<StageKey | "all">(
    STAGES.some(s => s.key === initialStage) ? (initialStage as StageKey) : "all"
  );
  const [selected, setSelected] = useState<App | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hire form state
  const [hireOpen, setHireOpen] = useState(false);
  const [hireRole, setHireRole] = useState<"EMPLOYEE" | "MANAGER" | "ADMIN">("EMPLOYEE");
  const [hirePosition, setHirePosition] = useState(defaultPosition ?? "");
  const [hireLocationId, setHireLocationId] = useState(defaultLocationId ?? "");

  const filtered = useMemo(() => {
    if (stage === "all") return items;
    return items.filter(a => a.status === stage);
  }, [items, stage]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of items) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [items]);

  async function patchApp(id: string, data: any) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Update failed"); return null; }
    return d;
  }

  async function moveStage(a: App, next: StageKey) {
    if (next === "hired") { setSelected(a); setHireOpen(true); return; }
    const ok = await patchApp(a.id, { status: next });
    if (!ok) return;
    setItems(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
    if (selected?.id === a.id) setSelected({ ...a, status: next });
  }

  async function confirmHire() {
    if (!selected) return;
    const d = await patchApp(selected.id, {
      status: "hired",
      hireRole, hirePosition: hirePosition || null, hireLocationId: hireLocationId || null,
    });
    if (!d) return;
    setItems(prev => prev.map(x => x.id === selected.id
      ? { ...x, status: "hired", hiredAt: new Date().toISOString(), invitationId: d.invitationId ?? x.invitationId }
      : x));
    setHireOpen(false);
    setSelected({ ...selected, status: "hired", invitationId: d.invitationId ?? selected.invitationId });
    r.refresh();
  }

  async function saveNotes(a: App, notes: string) {
    const d = await patchApp(a.id, { notes });
    if (!d) return;
    setItems(prev => prev.map(x => x.id === a.id ? { ...x, notes } : x));
    if (selected?.id === a.id) setSelected({ ...a, notes });
  }

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap p-1 bg-white/[0.03] border border-white/[0.06] rounded-md w-fit">
        <FilterChip active={stage === "all"} onClick={() => setStage("all")}>
          All <span className="text-ink-500">({items.length})</span>
        </FilterChip>
        {STAGES.map(s => (
          <FilterChip
            key={s.key}
            active={stage === s.key}
            onClick={() => setStage(s.key)}
          >
            {s.label} <span className="text-ink-500">({counts[s.key] ?? 0})</span>
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <UserIcon className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No applicants in this stage</h3>
          <p className="text-sm text-ink-500 mt-1">Share the public link to start receiving applications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
          <ul className="card divide-y divide-white/[0.06] overflow-hidden max-h-[640px] overflow-y-auto">
            {filtered.map(a => {
              const meta = STAGES.find(s => s.key === a.status) ?? STAGES[0];
              return (
                <li
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`p-3 cursor-pointer transition flex items-start gap-2.5 ${
                    selected?.id === a.id ? "bg-brand-500/8" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-white/[0.04] text-ink-300 flex items-center justify-center shrink-0 text-[11px] font-bold">
                    {a.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ink-50 truncate">{a.name}</div>
                    <div className="text-[11px] text-ink-500 truncate font-mono">{a.email}</div>
                  </div>
                  <span className={`status ${meta.cls}`}>{meta.label}</span>
                </li>
              );
            })}
          </ul>

          <div>
            {selected ? (
              <Detail
                app={selected}
                onMove={(s) => moveStage(selected, s)}
                onSaveNotes={(n) => saveNotes(selected, n)}
                busy={busy} error={error}
              />
            ) : (
              <div className="card p-12 text-center text-sm text-ink-500">
                Select an application to review.
              </div>
            )}
          </div>
        </div>
      )}

      {hireOpen && selected && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setHireOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-ink-900 rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
          >
            <header className="px-5 h-14 border-b border-white/[0.06] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm">Hire {selected.name}</span>
            </header>
            <div className="p-5 space-y-3">
              <p className="text-[13px] text-ink-300">
                This sends {selected.name} an invitation email to set up their shyftforce account.
                They'll appear as an active member once they accept (within 14 days).
              </p>
              <div>
                <label className="label">Role</label>
                <select className="input" value={hireRole} onChange={(e) => setHireRole(e.target.value as any)}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Position</label>
                <input
                  className="input"
                  value={hirePosition}
                  onChange={(e) => setHirePosition(e.target.value)}
                  placeholder="Server, Cook, Cashier…"
                />
              </div>
              {locations.length > 0 && (
                <div>
                  <label className="label">Home location</label>
                  <select className="input" value={hireLocationId} onChange={(e) => setHireLocationId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              {error && <div className="text-rose-300 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button onClick={() => setHireOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={confirmHire} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {busy ? "Hiring…" : "Send hire invitation"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-sm text-[12px] font-medium transition ${
        active ? "bg-brand-500/12 text-brand-300" : "text-ink-300 hover:text-ink-50"
      }`}
    >
      {children}
    </button>
  );
}

function Detail({
  app, onMove, onSaveNotes, busy, error,
}: {
  app: App;
  onMove: (s: StageKey) => void;
  onSaveNotes: (notes: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [notesDraft, setNotesDraft] = useState(app.notes ?? "");
  const [savedTick, setSavedTick] = useState(false);

  const flow: StageKey[] = ["new", "screen", "interview", "offer", "hired"];
  const idx = flow.indexOf(app.status as StageKey);
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center text-lg font-bold shrink-0">
          {app.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-ink-50">{app.name}</h2>
          <div className="text-[12px] text-ink-300 mt-1 flex items-center gap-3 flex-wrap font-mono">
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</span>
            {app.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.phone}</span>}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
        <span className={`status ${STAGES.find(s => s.key === app.status)?.cls ?? ""}`}>
          {STAGES.find(s => s.key === app.status)?.label}
        </span>
      </div>

      {/* Pipeline actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {next && (
          <button
            onClick={() => onMove(next)}
            disabled={busy}
            className="btn-primary btn-sm"
          >
            Move to {STAGES.find(s => s.key === next)?.label} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {app.status !== "hired" && app.status !== "rejected" && (
          <button onClick={() => onMove("hired")} disabled={busy} className="btn-ghost btn-sm text-emerald-400">
            <Check className="w-3.5 h-3.5" /> Hire
          </button>
        )}
        {app.status !== "rejected" && (
          <button onClick={() => onMove("rejected")} disabled={busy} className="btn-ghost btn-sm text-rose-400">
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        )}
      </div>
      {error && <div className="text-rose-300 text-xs">{error}</div>}
      {app.status === "hired" && app.invitationId && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-3 text-[12.5px] text-emerald-300">
          ✓ Invitation sent. {app.name} will appear in your member list once they accept.
        </div>
      )}

      {app.coverLetter && (
        <section>
          <h3 className="text-[11px] uppercase font-mono tracking-[0.12em] text-ink-500 mb-1.5">Cover letter / fit note</h3>
          <div className="text-[13.5px] text-ink-200 whitespace-pre-wrap leading-relaxed">{app.coverLetter}</div>
        </section>
      )}

      {app.resumeText && (
        <section>
          <h3 className="text-[11px] uppercase font-mono tracking-[0.12em] text-ink-500 mb-1.5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Resume / experience
          </h3>
          <div className="text-[13px] text-ink-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto p-3 bg-white/[0.02] border border-white/[0.06] rounded-md">
            {app.resumeText}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-[11px] uppercase font-mono tracking-[0.12em] text-ink-500 mb-1.5">Manager notes (private)</h3>
        <textarea
          className="input"
          rows={3}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => {
            if (notesDraft !== (app.notes ?? "")) {
              onSaveNotes(notesDraft);
              setSavedTick(true);
              setTimeout(() => setSavedTick(false), 1500);
            }
          }}
          maxLength={4000}
          placeholder="Strong on weekends, weak on close shifts. Asked $22/hr."
        />
        {savedTick && <div className="text-[11px] text-emerald-400 mt-1">Saved ✓</div>}
      </section>
    </div>
  );
}
