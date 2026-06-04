"use client";
import { useState } from "react";
import { ShiftEditDialog, type ShiftEditPayload, type VerticalOptions } from "./shift-edit-dialog";

/**
 * Per-position accent color. Agendrix uses a subtle vertical stripe down
 * the left edge of each shift card — much quieter than a fully tinted
 * background. We do the same: small palette, hash-stable per position.
 */
const STRIPE = [
  "#6aa2ff", // brand blue
  "#4ee0c5", // teal
  "#a78bff", // violet
  "#f5b544", // amber
  "#f17a8e", // rose
  "#8db9ff", // soft blue
  "#22d3ee", // cyan
  "#e879f9", // fuchsia
];

export function colorForPosition(p: string | null | undefined): string {
  const key = (p ?? "").toLowerCase();
  if (!key) return STRIPE[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return STRIPE[h % STRIPE.length];
}

/**
 * Shift card. Agendrix-style:
 *   - White-ish card with subtle border
 *   - 3px colored stripe on the left = position
 *   - Top line: time range (semibold, slightly larger)
 *   - Bottom line: position or location (muted)
 *   - Draft = dashed border + amber accent
 *   - Sample = dashed border + grey, "Sample" chip
 *
 * Hover lifts the card slightly to signal "you can click this to edit."
 */
export function ShiftCell({
  shift, members, canEdit, verticals, positions,
}: {
  shift: ShiftEditPayload;
  members: { id: string; name: string }[];
  canEdit: boolean;
  verticals?: VerticalOptions;
  positions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const isDraft = shift.status === "draft";
  const isSample = (shift.notes ?? "").startsWith("[sample]");
  const stripe = colorForPosition(shift.position);

  // Choose card surface + border based on state
  const surface = isSample
    ? "bg-ink-50/40 dark:bg-ink-800/30 border-dashed border-ink-300/60 dark:border-ink-700"
    : isDraft
      ? "bg-amber-50/60 dark:bg-amber-500/[0.06] border-dashed border-amber-300 dark:border-amber-500/30"
      : "bg-white dark:bg-white/[0.03] border-ink-200/70 dark:border-white/[0.07]";

  const muted = isSample
    ? "text-ink-500"
    : isDraft
      ? "text-amber-700 dark:text-amber-300"
      : "text-ink-500";

  return (
    <>
      <button
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        title={canEdit ? "Click to edit shift" : undefined}
        className={`block w-full text-left relative overflow-hidden rounded-md border ${surface} text-[11px] transition-all
          ${canEdit ? "cursor-pointer hover:shadow-sm hover:-translate-y-px hover:border-ink-300/80 dark:hover:border-white/[0.18]" : "cursor-default"}`}
      >
        {/* Left accent stripe — encodes the position visually without
            shouting. 3px keeps it readable but quiet. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-md"
          style={{ background: isDraft ? "#f5b544" : isSample ? "#94a3b8" : stripe }}
        />

        {/* Sample chip floats in top-right so it's obvious which shifts are
            seed data the manager can delete without consequence. */}
        {isSample && (
          <span className="absolute top-1 right-1 text-[8px] uppercase tracking-wider font-bold px-1.5 py-[1px] rounded-sm bg-ink-900/80 text-ink-50 dark:bg-ink-50/80 dark:text-ink-900">
            Sample
          </span>
        )}

        <div className="pl-2.5 pr-2 py-1.5">
          <div className="font-semibold text-ink-900 dark:text-ink-50 tabular-nums leading-tight">
            {shift.startTime}–{shift.endTime}
          </div>
          <div className={`truncate leading-tight mt-0.5 ${muted}`}>
            {shift.position || shift.locationName}
          </div>
        </div>
      </button>
      {open && (
        <ShiftEditDialog shift={shift} members={members} verticals={verticals} positions={positions} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
