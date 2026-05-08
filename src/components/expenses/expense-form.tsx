"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExpenseForm() {
  const r = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("mileage");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount), category, notes }),
    });
    setLoading(false); setAmount(""); setNotes(""); r.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <label className="label">Amount (USD)</label>
        <input className="input" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="mileage">Mileage</option>
          <option value="equipment">Equipment</option>
          <option value="training">Training</option>
          <option value="meal">Meal</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[68px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={loading || !amount}>{loading ? "Submitting…" : "Submit"}</button>
    </form>
  );
}
