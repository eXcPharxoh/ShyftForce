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
  const [tone, setTone] = useState<"ok" | "warn" | "error">("ok");
  // When the server flags a "warn" blackout, the request is allowed but needs
  // an explicit acknowledgement on resubmit. We flip this on and send it next.
  const [ackBlackout, setAckBlackout] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsOn, endsOn, category, reason, acknowledgeBlackout: ackBlackout }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (res.ok) {
        setTone("ok"); setMsg("Request submitted!"); setReason(""); setAckBlackout(false);
        r.refresh();
        return;
      }
      if (data.code === "blackout_warn") {
        // Allowed, but ask the requester to confirm — next submit carries the ack.
        setAckBlackout(true); setTone("warn");
        setMsg(data.error ?? "These dates overlap a busy period. Submit again to send it anyway.");
        return;
      }
      // Show the real reason (hard blackout, overlap, balance, validation) instead
      // of a generic "something went wrong".
      setTone("error");
      setMsg(data.error ?? "Couldn't submit your request. Please check the dates and try again.");
    } catch {
      setLoading(false); setTone("error");
      setMsg("Couldn't reach the server — check your connection and try again.");
    }
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
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Submitting…" : ackBlackout ? "Submit anyway" : "Submit request"}
      </button>
      {msg && (
        <div className={`text-xs ${
          tone === "ok"    ? "text-emerald-600 dark:text-emerald-400" :
          tone === "warn"  ? "text-amber-600 dark:text-amber-400" :
                             "text-rose-600 dark:text-rose-400"
        }`}>{msg}</div>
      )}
    </form>
  );
}
