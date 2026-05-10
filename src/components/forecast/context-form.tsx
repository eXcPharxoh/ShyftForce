"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

type CtxItem = {
  id: string;
  locationId: string | null;
  startsAt: string;
  endsAt: string;
  category: string;
  label: string;
  expectedImpactPct: number;
};

export function ContextForm({ locationId, items }: { locationId: string; items: CtxItem[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<"weather" | "event" | "holiday" | "promotion" | "manual">("event");
  const [impact, setImpact] = useState(20);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!label.trim()) { setError("Label required"); return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/forecast/context", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        startsAt: new Date(`${date}T00:00:00`).toISOString(),
        endsAt:   new Date(`${date}T23:59:59`).toISOString(),
        category, label, expectedImpactPct: impact, source: "manual",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setLabel(""); setOpen(false);
    r.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this context event?")) return;
    await fetch(`/api/forecast/context/${id}`, { method: "DELETE" });
    r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Context events ({items.length})</h3>
        <button onClick={() => setOpen((v) => !v)} className="btn-outline text-xs">
          <Plus className="w-3.5 h-3.5" /> Add event
        </button>
      </div>

      {open && (
        <div className="rounded-xl border border-ink-200 dark:border-ink-700 p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                <option value="event">Event</option>
                <option value="weather">Weather</option>
                <option value="holiday">Holiday</option>
                <option value="promotion">Promotion</option>
                <option value="manual">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Label</label>
              <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sox home game" />
            </div>
            <div>
              <label className="label">Impact (%)</label>
              <input className="input" type="number" step="5" value={impact} onChange={(e) => setImpact(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {error && <div className="text-rose-600 text-xs">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={add} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add event
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {items.map((c) => (
            <li key={c.id} className="py-2 flex items-center gap-3">
              <span className="badge-gray uppercase text-[10px]">{c.category}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-[11px] text-ink-500">
                  {new Date(c.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}
                  <span className={c.expectedImpactPct >= 0 ? "text-emerald-700" : "text-rose-700"}>
                    {c.expectedImpactPct >= 0 ? "+" : ""}{c.expectedImpactPct}%
                  </span>
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="btn-ghost text-rose-600 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
