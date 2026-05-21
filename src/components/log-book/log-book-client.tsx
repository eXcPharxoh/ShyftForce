"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, X, Loader2, Check, Trash2, AlertTriangle, Sparkles, Wrench, Package, ShieldCheck, FileText } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Entry = {
  id: string;
  occurredOn: string;
  category: string;
  title: string | null;
  body: string;
  authorName: string;
  locationName: string | null;
  followUpRequired: boolean;
  resolvedAt: string | null;
  createdAt: string;
};

const CATEGORIES = [
  { v: "recap",       l: "Recap",       icon: BookOpen,    tone: "info"    },
  { v: "incident",    l: "Incident",    icon: AlertTriangle, tone: "danger" },
  { v: "vip",         l: "VIP",         icon: Sparkles,    tone: "info"    },
  { v: "maintenance", l: "Maintenance", icon: Wrench,      tone: "warn"    },
  { v: "inventory",   l: "Inventory",   icon: Package,     tone: "warn"    },
  { v: "safety",      l: "Safety",      icon: ShieldCheck, tone: "danger"  },
  { v: "other",       l: "Other",       icon: FileText,    tone: "mute"    },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogBookClient({
  initial, locations,
}: {
  initial: Entry[];
  locations: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Form state
  const [occurredOn, setOccurredOn] = useState(today());
  const [category, setCategory] = useState<string>("recap");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/log-book", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurredOn, category, title: title.trim() || null, body: body.trim(),
        followUpRequired: followUp, locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setTitle(""); setBody(""); setFollowUp(false); r.refresh();
  }

  async function toggleResolved(e: Entry) {
    const wasResolved = !!e.resolvedAt;
    const res = await fetch(`/api/log-book/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !wasResolved }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === e.id
        ? { ...x, resolvedAt: wasResolved ? null : new Date().toISOString() }
        : x
      ));
    }
  }

  async function remove(e: Entry) {
    const ok = await confirm({ title: "Delete this log entry?", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/log-book/${e.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== e.id));
  }

  const filtered = filter === "all" ? items : items.filter(e => e.category === filter);

  // Group by date
  const byDate: Record<string, Entry[]> = {};
  for (const e of filtered) {
    byDate[e.occurredOn] = byDate[e.occurredOn] ?? [];
    byDate[e.occurredOn].push(e);
  }

  function fmtDate(iso: string) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function toneClass(tone: string) {
    return tone === "danger" ? "status-danger" : tone === "warn" ? "status-warn" : tone === "info" ? "status-info" : "status-mute";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex flex-wrap gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-md">
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-sm text-[12px] font-medium transition ${filter === "all" ? "bg-brand-500/12 text-brand-300" : "text-ink-300"}`}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.v}
              onClick={() => setFilter(c.v)}
              className={`px-3 py-1.5 rounded-sm text-[12px] font-medium transition ${filter === c.v ? "bg-brand-500/12 text-brand-300" : "text-ink-300"}`}
            >
              {c.l}
            </button>
          ))}
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New entry</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No log entries yet</h3>
          <p className="text-sm text-ink-500 mt-1">Start a journal of operational notes, incidents, VIP arrivals — anything the next manager on duty should know.</p>
        </div>
      ) : (
        Object.entries(byDate).map(([date, entries]) => (
          <section key={date}>
            <div className="text-xs uppercase font-mono tracking-[0.12em] text-ink-500 mb-2">{fmtDate(date)}</div>
            <ul className="space-y-2">
              {entries.map(e => {
                const meta = CATEGORIES.find(c => c.v === e.category) ?? CATEGORIES[6];
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                        meta.tone === "danger" ? "bg-danger/15 text-danger" :
                        meta.tone === "warn"   ? "bg-warn/15 text-warn"     :
                        meta.tone === "info"   ? "bg-brand-500/15 text-brand-300" :
                                                 "bg-white/[0.04] text-ink-300"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`status ${toneClass(meta.tone)}`}>{meta.l}</span>
                          {e.title && <span className="text-[14px] font-semibold text-ink-50">{e.title}</span>}
                          {e.followUpRequired && !e.resolvedAt && (
                            <span className="status status-warn">Needs follow-up</span>
                          )}
                          {e.resolvedAt && (
                            <span className="status status-success">Resolved</span>
                          )}
                        </div>
                        <div className="text-[13.5px] text-ink-300 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {e.body}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-2 flex items-center gap-2 font-mono">
                          <span>{e.authorName}</span>
                          {e.locationName && <span>· {e.locationName}</span>}
                          <span>· {new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {e.followUpRequired && (
                          <button onClick={() => toggleResolved(e)} className="btn-ghost btn-sm" title={e.resolvedAt ? "Reopen" : "Mark resolved"}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => remove(e)} aria-label="Delete" className="btn-ghost btn-sm text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <header className="px-5 h-14 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New log entry</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-white/[0.04]"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Title (optional)</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="VIP arrival Saturday 8pm" />
              </div>
              <div>
                <label className="label">Notes *</label>
                <textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={8000} placeholder="What happened? What did you do? What does the next manager need to know?" />
              </div>
              {locations.length > 0 && (
                <div>
                  <label className="label">Location (optional)</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    <option value="">All locations</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="w-4 h-4" />
                Requires follow-up
              </label>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log it
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
