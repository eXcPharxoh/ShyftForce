import { cn } from "@/lib/utils";

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? "w-7 h-7 text-base" : size === "lg" ? "w-12 h-12 text-2xl" : "w-9 h-9 text-lg";
  return (
    <span className={cn(
      "inline-flex items-center justify-center font-black text-white",
      "rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-rose-500",
      "shadow-[0_4px_14px_-4px_rgba(249,115,22,0.55)] ring-1 ring-inset ring-white/30",
      dim, className,
    )}>
      <span aria-hidden="true">⚡</span>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight-2 text-ink-900 dark:text-ink-50", className)}>
      shyft<span className="text-gradient-brand">force</span>
    </span>
  );
}
