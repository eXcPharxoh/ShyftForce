import { cn } from "@/lib/utils";

/**
 * Unified skeleton primitives. Replaces per-page hand-rolled shimmer divs
 * (every loading.tsx invented its own). All variants use the `.skeleton`
 * class from globals.css for the shared shimmer animation — single source
 * of truth for the motion.
 *
 *   <Skeleton />                    — generic rectangle (existing usage)
 *   <Skeleton variant="text" />     — line of text (height ~3.5)
 *   <Skeleton variant="circle" />   — circular shape
 *   <Skeleton variant="avatar" />   — 36px circular avatar
 *   <Skeleton variant="card" />     — card placeholder
 *   <Skeleton variant="row" />      — table-row bar
 *
 * Pass `className` for size overrides like `w-32 h-8`. The legacy
 * one-arg usage `<Skeleton className="…" />` still works — variant is
 * optional and defaults to a plain rounded rect.
 */
export type SkeletonVariant = "rect" | "text" | "circle" | "card" | "row" | "avatar";

const VARIANT: Record<SkeletonVariant, string> = {
  rect:   "rounded-md",
  text:   "rounded h-3.5 w-full",
  circle: "rounded-full aspect-square",
  avatar: "rounded-full w-9 h-9",
  card:   "rounded-lg h-28 w-full",
  row:    "rounded h-12 w-full",
};

export function Skeleton({
  variant,
  className,
}: {
  variant?: SkeletonVariant;
  className?: string;
}) {
  const v = variant ? VARIANT[variant] : "";
  return <div aria-hidden className={cn("skeleton", v, className)} />;
}

/**
 * Block of N text-line skeletons for placeholder paragraphs. Last line
 * is shorter for a natural ragged-right look.
 */
export function SkeletonLines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="text" className={i === count - 1 ? "w-3/4" : "w-full"} />
      ))}
    </div>
  );
}

/**
 * N table-row skeletons. Drop inside a card to match a real table's
 * vertical rhythm while a query is in flight.
 */
export function SkeletonTable({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}

/**
 * Avatar + name + sub-line — the most common "loading person" pattern,
 * shared by member lists, activity feeds, attendance rows.
 */
export function SkeletonPersonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-1.5">
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="text" className="w-48 h-2.5" />
      </div>
    </div>
  );
}
