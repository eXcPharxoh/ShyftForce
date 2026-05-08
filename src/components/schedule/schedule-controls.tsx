"use client";
import { Filter } from "lucide-react";

export function ScheduleControls({
  locations, totalShifts, openShifts, drafts,
}: {
  locations: { id: string; name: string }[];
  totalShifts: number; openShifts: number; drafts: number;
}) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-ink-500" />
        <select className="input h-8 w-44 text-xs">
          <option>All Locations</option>
          {locations.map(l => <option key={l.id}>{l.name}</option>)}
        </select>
        <select className="input h-8 w-44 text-xs">
          <option>All Positions</option>
          <option>Security Officer</option>
          <option>Site Manager</option>
          <option>Patrol</option>
        </select>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-ink-600">{totalShifts} shifts</span>
        <span className="badge-orange">{openShifts} open</span>
        <span className="badge bg-amber-100 text-amber-800">{drafts} drafts</span>
      </div>
    </div>
  );
}
