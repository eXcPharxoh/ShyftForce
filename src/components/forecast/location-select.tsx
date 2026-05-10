"use client";
import { useRouter } from "next/navigation";

export function LocationSelect({ current, locations, weekParam }: { current: string; locations: { id: string; name: string }[]; weekParam: string }) {
  const r = useRouter();
  return (
    <select
      defaultValue={current}
      className="input h-9 text-xs w-44"
      onChange={(e) => r.push(`/schedule/forecast?location=${e.target.value}${weekParam ? `&w=${weekParam}` : ""}`)}
    >
      {locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
    </select>
  );
}
