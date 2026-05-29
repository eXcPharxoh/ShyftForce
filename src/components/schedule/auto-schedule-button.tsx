"use client";
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { AutoScheduleDialog } from "./auto-schedule-dialog";

export function AutoScheduleButton({ locations, aiConfigured = true }: { locations: { id: string; name: string }[]; aiConfigured?: boolean }) {
  const [open, setOpen] = useState(false);
  // Without SHYFTFORCE_AI_KEY the endpoint returns 500 — hide the button so
  // users don't click it and hit a confusing error.
  if (!aiConfigured) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline h-9 gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50">
        <Wand2 className="w-4 h-4" /> Generate with AI
      </button>
      <AutoScheduleDialog open={open} onClose={() => setOpen(false)} locations={locations} />
    </>
  );
}
