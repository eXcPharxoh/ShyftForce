"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExpenseActions({ requestId }: { requestId: string }) {
  const r = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  async function act(status: "approved" | "rejected") {
    setLoading(status);
    await fetch(`/api/expenses/${requestId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null); r.refresh();
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => act("rejected")} disabled={loading !== null} className="btn-ghost text-xs text-rose-600">{loading === "rejected" ? "…" : "Reject"}</button>
      <button onClick={() => act("approved")} disabled={loading !== null} className="btn-primary text-xs">{loading === "approved" ? "…" : "Approve"}</button>
    </div>
  );
}
