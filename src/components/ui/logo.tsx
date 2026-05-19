import { cn } from "@/lib/utils";

/**
 * Bolt — the official shyftforce brandmark. SVG with a linear gradient
 * (#9bc1ff → #3a6fd8) and an optional glow filter. From the design handoff
 * README spec — pair this with the wordmark in nav, footer, CTAs.
 */
export function Bolt({ size = 24, glow = true, className }: { size?: number; glow?: boolean; className?: string }) {
  const gradId = `bolt-grad-${size}`;
  const glowId = `bolt-glow-${size}`;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#9bc1ff" />
          <stop offset="100%" stopColor="#3a6fd8" />
        </linearGradient>
        {glow && (
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#6aa2ff" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feComposite in="SourceGraphic" />
          </filter>
        )}
      </defs>
      <path
        d="M13 2 L4 14 H11 L9 22 L20 9 H13 Z"
        fill={`url(#${gradId})`}
        filter={glow ? `url(#${glowId})` : undefined}
      />
    </svg>
  );
}

/**
 * Backwards-compatible Logo wrapper. Renders the bolt at the appropriate size.
 * Replaces the old gradient "⚡" emoji square.
 */
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "sm" ? 18 : size === "lg" ? 36 : 24;
  return <Bolt size={px} className={className} />;
}

/**
 * Lowercase `shyftforce` wordmark. Display font, weight 600, tight tracking
 * per the design spec.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(
      "font-display font-semibold text-ink-50 lowercase",
      className,
    )} style={{ letterSpacing: "-0.02em" }}>
      shyftforce
    </span>
  );
}
