"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";

export function ExpenseActions({ requestId }: { requestId: string }) {
  const r = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  async function act(status: "approved" | "rejected") {
    setLoading(status);
    try {
      const res = await fetch(`/api/expenses/${requestId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setLoading(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(`Couldn't ${status === "approved" ? "approve" : "reject"} the expense`, { description: data.error ?? "Please try again." });
        return;
      }
      toast.success(status === "approved" ? "Expense approved" : "Expense rejected");
      r.refresh();
    } catch {
      setLoading(null);
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => act("rejected")} disabled={loading !== null} className="btn-ghost text-xs text-rose-600">{loading === "rejected" ? "…" : "Reject"}</button>
      <button onClick={() => act("approved")} disabled={loading !== null} className="btn-primary text-xs">{loading === "approved" ? "…" : "Approve"}</button>
    </div>
  );
}
