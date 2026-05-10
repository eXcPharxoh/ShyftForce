"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";

export function ApplyButton({ locationId, weekStart }: { locationId: string; weekStart: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!confirm("Generate draft shifts from this forecast? Existing draft shifts at this location for the week will be replaced (published shifts are untouched).")) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/forecast/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, weekStart }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    r.refresh();
    alert(`Created ${data.created} draft shifts. Open Schedule to assign people.`);
  }
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-outline text-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
        {busy ? "Applying…" : "Apply as draft week"}
      </button>
      {error && <div className="text-[10px] text-rose-600 mt-1">{error}</div>}
    </div>
  );
}
