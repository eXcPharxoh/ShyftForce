"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";

export function IncidentStatusForm({ incidentId, initialStatus, initialSeverity, initialResolutionNotes }: {
  incidentId: string;
  initialStatus: "open" | "reviewing" | "resolved" | "escalated";
  initialSeverity: "low" | "medium" | "high" | "critical";
  initialResolutionNotes: string;
}) {
  const r = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [severity, setSeverity] = useState(initialSeverity);
  const [resolutionNotes, setNotes] = useState(initialResolutionNotes);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null); setDone(false);
    const res = await fetch(`/api/incidents/${incidentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, severity, resolutionNotes: resolutionNotes || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(true);
    r.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
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
        <label className="label">Resolution notes</label>
        <textarea className="input min-h-[100px]" value={resolutionNotes} onChange={(e) => setNotes(e.target.value)} placeholder="What action was taken, who followed up, when resolved…" />
      </div>
      {error && <div className="text-rose-600 text-xs">{error}</div>}
      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {done ? "Saved" : "Update incident"}
        </button>
      </div>
    </div>
  );
}
