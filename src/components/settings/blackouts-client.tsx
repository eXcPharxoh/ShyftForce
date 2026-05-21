"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Plus, X, Loader2, Trash2, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Blackout = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  mode: "hard" | "soft" | "warn";
  locationId: string | null;
  locationName: string | null;
  createdByName: string | null;
};

const MODES = [
  { v: "hard", l: "Hard",  desc: "Block requests",     icon: ShieldAlert,    tone: "danger" },
  { v: "soft", l: "Soft",  desc: "Allow + flag",       icon: AlertTriangle,  tone: "warn"   },
  { v: "warn", l: "Warn",  desc: "Heads-up only",      icon: Info,           tone: "info"   },
] as const;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function BlackoutsClient({
  initial, locations,
}: {
  initial: Blackout[];
  locations: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today());
  const [endsOn, setEndsOn] = useState(today());
  const [mode, setMode] = useState<"hard" | "soft" | "warn">("soft");
  const [locId, setLocId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/time-off/blackouts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        startsOn, endsOn, mode,
        locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setMode("soft"); setLocId("");
    r.refresh();
  }

  async function remove(b: Blackout) {
    const ok = await confirm({
      title: `Delete blackout "${b.name}"?`,
      description: "Pending requests already submitted for this window won't be affected.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await fetch(`/api/time-off/blackouts/${b.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== b.id));
  }

  function modeMeta(m: string) {
    return MODES.find(x => x.v === m) ?? MODES[1];
  }

  function toneClass(tone: string) {
    return tone === "danger" ? "status-danger" : tone === "warn" ? "status-warn" : "status-info";
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] text-ink-500 font-mono">
          {items.length} active or upcoming window{items.length === 1 ? "" : "s"}
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add blackout
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarX className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No blackout windows defined</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Block time-off during stat holidays, audits, or your busy season. Staff see the reason instead of an unexplained denial.
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-white/[0.06] overflow-hidden">
          {items.map(b => {
            const meta = modeMeta(b.mode);
            const Icon = meta.icon;
            return (
              <li key={b.id} className="p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                  meta.tone === "danger" ? "bg-danger/15 text-danger" :
                  meta.tone === "warn"   ? "bg-warn/15 text-warn"     :
                                           "bg-brand-500/15 text-brand-300"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-ink-50">{b.name}</span>
                    <span className={`status ${toneClass(meta.tone)}`}>{meta.l}</span>
                    {b.locationName && (
                      <span className="status status-mute">{b.locationName}</span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-ink-300 mt-1 font-mono">
                    {fmt(b.startsOn)} → {fmt(b.endsOn)} · {daysBetween(b.startsOn, b.endsOn)} days
                  </div>
                  {b.createdByName && (
                    <div className="text-[11px] text-ink-500 mt-1">Added by {b.createdByName}</div>
                  )}
                </div>
                <button
                  onClick={() => remove(b)}
                  aria-label="Delete"
                  className="btn-ghost btn-sm text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-ink-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <header className="px-5 h-14 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New blackout window</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-white/[0.04]">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Holiday rush · Year-end audit · Restaurant week"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts on *</label>
                  <input
                    className="input"
                    type="date"
                    value={startsOn}
                    onChange={(e) => setStartsOn(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Ends on *</label>
                  <input
                    className="input"
                    type="date"
                    value={endsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                    required
                    min={startsOn}
                  />
                </div>
              </div>

              <div>
                <label className="label">Mode *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {MODES.map(m => {
                    const Icon = m.icon;
                    const active = mode === m.v;
                    return (
                      <button
                        key={m.v}
                        type="button"
                        onClick={() => setMode(m.v)}
                        className={`p-3 rounded-md border text-left transition ${
                          active
                            ? "border-brand-500/60 bg-brand-500/8 text-ink-50"
                            : "border-white/[0.08] bg-white/[0.02] text-ink-300 hover:border-white/[0.16]"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${
                          m.tone === "danger" ? "text-danger" : m.tone === "warn" ? "text-warn" : "text-brand-400"
                        }`} />
                        <div className="text-[13px] font-semibold">{m.l}</div>
                        <div className="text-[11px] text-ink-500 mt-0.5">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="label">Location (optional)</label>
                  <select
                    className="input"
                    value={locId}
                    onChange={(e) => setLocId(e.target.value)}
                  >
                    <option value="">All locations</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-500 mt-1">
                    Leave blank to apply org-wide. Otherwise it only blocks requests from staff whose home location matches.
                  </p>
                </div>
              )}

              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>

            <footer className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !name.trim()} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create blackout
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
