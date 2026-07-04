"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toaster";

export function TimesheetActions({ entryId, approved }: { entryId: string; approved: boolean }) {
  const r = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/timesheets/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !approved }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(approved ? "Couldn't unapprove" : "Couldn't approve", { description: data.error ?? "Please try again." });
        return;
      }
      r.refresh();
    } catch {
      setLoading(false);
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
    }
  }
  return (
    <button onClick={toggle} disabled={loading} className={approved ? "btn-ghost text-xs" : "btn-primary text-xs"}>
      {loading ? "…" : approved ? "Unapprove" : "Approve"}
    </button>
  );
}
