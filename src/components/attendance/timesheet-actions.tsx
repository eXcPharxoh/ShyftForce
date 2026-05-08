"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TimesheetActions({ entryId, approved }: { entryId: string; approved: boolean }) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    await fetch(`/api/timesheets/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    setLoading(false);
    r.refresh();
  }
  return (
    <button onClick={toggle} disabled={loading} className={approved ? "btn-ghost text-xs" : "btn-primary text-xs"}>
      {loading ? "…" : approved ? "Unapprove" : "Approve"}
    </button>
  );
}
