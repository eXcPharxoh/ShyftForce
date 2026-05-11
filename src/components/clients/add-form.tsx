"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export function AddClientForm({ locations }: { locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setEmail] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [rate, setRate] = useState("35.00");
  const [otMult, setOtMult] = useState("1.5");
  const [terms, setTerms] = useState<"net_15" | "net_30" | "net_60" | "due_on_receipt">("net_30");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLoc(id: string) {
    setLocationIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!name.trim()) { setError("Name required"); return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        billRateCents: Math.round(Number(rate) * 100),
        overtimeMultiplier: Number(otMult),
        invoiceTerms: terms,
        locationIds,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setName(""); setContactName(""); setEmail(""); setPhone("");
    setLocationIds([]);
    r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Client name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Industries" />
        </div>
        <div>
          <label className="label">Contact name</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input className="input" type="email" value={contactEmail} onChange={(e) => setEmail(e.target.value)} placeholder="ap@acme.com" />
        </div>
        <div>
          <label className="label">Contact phone</label>
          <input className="input" value={contactPhone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-0100" />
        </div>
        <div>
          <label className="label">Bill rate (USD/hr)</label>
          <input className="input" type="number" step="0.50" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label className="label">Overtime multiplier</label>
          <input className="input" type="number" step="0.1" min="1" max="3" value={otMult} onChange={(e) => setOtMult(e.target.value)} />
        </div>
        <div>
          <label className="label">Invoice terms</label>
          <select className="input" value={terms} onChange={(e) => setTerms(e.target.value as any)}>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_60">Net 60</option>
            <option value="due_on_receipt">Due on receipt</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Assign locations</label>
        <div className="flex flex-wrap gap-1.5">
          {locations.map((l) => (
            <button key={l.id} type="button" onClick={() => toggleLoc(l.id)} className={`text-xs px-3 py-1.5 rounded-full border transition ${locationIds.includes(l.id) ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold" : "border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-ink-50"}`}>
              {l.name}
            </button>
          ))}
          {locations.length === 0 && <span className="text-[11px] text-ink-500">No locations yet — add some first.</span>}
        </div>
      </div>
      {error && <div className="text-rose-600 text-xs">{error}</div>}
      <div className="flex justify-end">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add client
        </button>
      </div>
    </div>
  );
}
