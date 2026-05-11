"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, Loader2, X, Send } from "lucide-react";

const CATEGORIES = [
  { id: "theft", label: "Theft / shoplifting" },
  { id: "trespass", label: "Trespassing" },
  { id: "medical", label: "Medical emergency" },
  { id: "altercation", label: "Altercation / fight" },
  { id: "property_damage", label: "Property damage" },
  { id: "policy_violation", label: "Policy violation" },
  { id: "safety", label: "Safety hazard" },
  { id: "other", label: "Other" },
];

export function FileIncidentButton({ locations, shiftId, label = "File incident" }: {
  locations: { id: string; name: string }[];
  shiftId?: string;
  label?: string;
}) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [category, setCategory] = useState<string>("trespass");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("low");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [witnessNames, setWitness] = useState("");
  const [policeReportNo, setPolice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !body.trim()) { setError("Title and description required"); return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/incidents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: locationId || null,
        shiftId: shiftId ?? null,
        occurredAt: new Date().toISOString(),
        category, severity,
        title: title.trim(),
        body: body.trim(),
        witnessNames: witnessNames.trim() || null,
        policeReportNo: policeReportNo.trim() || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOpen(false);
    setTitle(""); setBody(""); setWitness(""); setPolice("");
    r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline text-xs border-rose-300 text-rose-700 dark:border-rose-500/40 dark:text-rose-300">
        <AlertOctagon className="w-4 h-4" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div>
                <div className="font-semibold text-sm flex items-center gap-1.5"><AlertOctagon className="w-4 h-4 text-rose-600" /> File incident report</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">Critical/high incidents auto-DM all managers</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto scroll-thin">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                    <option value="">(none)</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Severity</label>
                  <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary — e.g. Trespassing at loading dock" />
              </div>
              <div>
                <label className="label">Full description</label>
                <textarea className="input min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened, when, who was involved, what action was taken…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Witnesses (optional)</label>
                  <input className="input" value={witnessNames} onChange={(e) => setWitness(e.target.value)} placeholder="Names, comma separated" />
                </div>
                <div>
                  <label className="label">Police report # (optional)</label>
                  <input className="input" value={policeReportNo} onChange={(e) => setPolice(e.target.value)} placeholder="If police involved" />
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex justify-end gap-2 shrink-0">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} File report
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
