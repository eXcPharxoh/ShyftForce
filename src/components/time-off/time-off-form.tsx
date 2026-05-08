"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TimeOffForm() {
  const r = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [category, setCategory] = useState("vacation");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch("/api/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsOn, endsOn, category, reason }),
    });
    setLoading(false);
    if (res.ok) { setMsg("Request submitted!"); setReason(""); r.refresh(); }
    else setMsg("Something went wrong.");
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">From</label>
          <input className="input" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" required value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="personal">Personal</option>
          <option value="bereavement">Bereavement</option>
          <option value="unpaid">Unpaid leave</option>
        </select>
      </div>
      <div>
        <label className="label">Reason (optional)</label>
        <textarea className="input min-h-[68px]" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Submitting…" : "Submit request"}</button>
      {msg && <div className="text-xs text-ink-600">{msg}</div>}
    </form>
  );
}
