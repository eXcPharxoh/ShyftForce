"use client";
import { useState } from "react";
import { ShiftEditDialog, type ShiftEditPayload } from "./shift-edit-dialog";

// Stable per-position color (8 swatches that look good light + dark)
const PALETTE = [
  { bg: "bg-brand-50 dark:bg-brand-500/15",     border: "border-brand-200 dark:border-brand-500/40",   text: "text-brand-800 dark:text-brand-200" },
  { bg: "bg-emerald-50 dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/40", text: "text-emerald-800 dark:text-emerald-200" },
  { bg: "bg-sky-50 dark:bg-sky-500/15",         border: "border-sky-200 dark:border-sky-500/40",       text: "text-sky-800 dark:text-sky-200" },
  { bg: "bg-violet-50 dark:bg-violet-500/15",   border: "border-violet-200 dark:border-violet-500/40", text: "text-violet-800 dark:text-violet-200" },
  { bg: "bg-rose-50 dark:bg-rose-500/15",       border: "border-rose-200 dark:border-rose-500/40",     text: "text-rose-800 dark:text-rose-200" },
  { bg: "bg-amber-50 dark:bg-amber-500/15",     border: "border-amber-200 dark:border-amber-500/40",   text: "text-amber-800 dark:text-amber-200" },
  { bg: "bg-cyan-50 dark:bg-cyan-500/15",       border: "border-cyan-200 dark:border-cyan-500/40",     text: "text-cyan-800 dark:text-cyan-200" },
  { bg: "bg-fuchsia-50 dark:bg-fuchsia-500/15", border: "border-fuchsia-200 dark:border-fuchsia-500/40", text: "text-fuchsia-800 dark:text-fuchsia-200" },
];

export function colorForPosition(p: string | null | undefined) {
  const key = (p ?? "").toLowerCase();
  if (!key) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function ShiftCell({
  shift, members, canEdit,
}: {
  shift: ShiftEditPayload;
  members: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isDraft = shift.status === "draft";
  const colors = colorForPosition(shift.position);

  return (
    <>
      <button
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={`block w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition border
          ${isDraft
            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 border-dashed"
            : `${colors.bg} ${colors.border} ${colors.text}`}
          ${canEdit ? "cursor-pointer hover:scale-[1.02] hover:shadow-sm" : "cursor-default"}`}
      >
        <div className="font-semibold">{shift.startTime} – {shift.endTime}</div>
        <div className="opacity-80 truncate">{shift.position || shift.locationName}</div>
      </button>
      {open && (
        <ShiftEditDialog shift={shift} members={members} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
