"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, Coffee, LogOut } from "lucide-react";

export function ClockButton({ memberId, state }: { memberId: string; state: "in" | "break" | "out" }) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);

  async function fire(type: "clock_in" | "clock_out" | "break_start" | "break_end") {
    setLoading(true);
    await fetch("/api/attendance/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, type }),
    });
    setLoading(false);
    r.refresh();
  }

  if (state === "out") {
    return <button onClick={() => fire("clock_in")} disabled={loading} className="btn-primary"><Clock className="w-4 h-4" /> Clock in</button>;
  }
  if (state === "break") {
    return <button onClick={() => fire("break_end")} disabled={loading} className="btn-primary"><Clock className="w-4 h-4" /> End break</button>;
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => fire("break_start")} disabled={loading} className="btn-outline"><Coffee className="w-4 h-4" /> Break</button>
      <button onClick={() => fire("clock_out")} disabled={loading} className="btn-primary"><LogOut className="w-4 h-4" /> Clock out</button>
    </div>
  );
}
