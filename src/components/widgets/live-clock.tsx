"use client";
import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="text-3xl font-bold tracking-tight">—</div>;
  return (
    <div>
      <div className="text-3xl font-bold tracking-tight tabular-nums">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-sm text-ink-500 mt-1">
        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </div>
    </div>
  );
}
