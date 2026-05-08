"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

type Stats = { working: number; onBreak: number; lateOrAbsent: number };

export function AttendanceTracker({ initial }: { initial: Stats }) {
  const [stats, setStats] = useState(initial);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/attendance/live"); if (!res.ok) return;
        setStats(await res.json());
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { k: "Working", v: stats.working, color: "emerald" },
        { k: "On Break", v: stats.onBreak, color: "amber" },
        { k: "Late/Absent", v: stats.lateOrAbsent, color: "rose" },
      ].map((s) => (
        <div key={s.k} className={`rounded-xl p-3 bg-${s.color}-50`}>
          <div className={`text-2xl font-bold text-${s.color}-700`}>{s.v}</div>
          <div className={`text-[11px] text-${s.color}-700 font-medium mt-0.5 flex items-center gap-1`}>
            <Activity className="w-3 h-3" /> {s.k}
          </div>
        </div>
      ))}
    </div>
  );
}
