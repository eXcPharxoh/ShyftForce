import type { LucideIcon } from "lucide-react";

/**
 * Empty state with a layered, illustrated feel — rotated background
 * "ghost" tiles behind the icon medallion give the page some character
 * instead of looking like a stock data-table emptiness. Three tones map
 * to brand / success / neutral so the illustration tints with the
 * page's emotional register.
 */
export function EmptyState({
  icon: Icon, title, description, action, tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn";
}) {
  // Per-tone palette for the medallion + the ghost tiles behind it.
  const palette =
    tone === "brand"   ? { ring: "rgba(106,162,255,0.30)", glow: "rgba(106,162,255,0.18)", medGrad: "linear-gradient(135deg, rgba(106,162,255,0.18), rgba(106,162,255,0.04))", iconTint: "#8db9ff" } :
    tone === "success" ? { ring: "rgba(78,224,197,0.30)",  glow: "rgba(78,224,197,0.18)",  medGrad: "linear-gradient(135deg, rgba(78,224,197,0.18), rgba(78,224,197,0.04))",  iconTint: "#4ee0c5" } :
    tone === "warn"    ? { ring: "rgba(245,181,68,0.30)",  glow: "rgba(245,181,68,0.18)",  medGrad: "linear-gradient(135deg, rgba(245,181,68,0.18), rgba(245,181,68,0.04))",  iconTint: "#f5b544" } :
                         { ring: "rgba(255,255,255,0.12)", glow: "rgba(255,255,255,0.04)", medGrad: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))", iconTint: "#b0bbd1" };

  return (
    <div className="relative text-center py-14 px-6 animate-fade-up overflow-hidden">
      {/* Ghost icon tiles behind — softens the bare-page feeling without
          requiring a per-state SVG illustration. Rotated copies of the
          medallion at low opacity, blurred. */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden>
        <span
          className="absolute w-32 h-32 rounded-3xl rotate-[-12deg] -translate-x-24 translate-y-2 blur-sm opacity-[0.35]"
          style={{ background: palette.medGrad, border: `1px solid ${palette.ring}` }}
        />
        <span
          className="absolute w-32 h-32 rounded-3xl rotate-[18deg] translate-x-24 -translate-y-2 blur-sm opacity-[0.35]"
          style={{ background: palette.medGrad, border: `1px solid ${palette.ring}` }}
        />
      </div>

      {/* The main medallion — slightly larger than before (72px), with an
          outer glow ring + an inner specular highlight for depth. */}
      <div
        className="relative mx-auto w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: palette.medGrad,
          border: `1px solid ${palette.ring}`,
          boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 32px -8px ${palette.glow}`,
        }}
      >
        <Icon className="w-8 h-8" style={{ color: palette.iconTint }} />
      </div>

      <h3 className="relative font-semibold text-ink-50 text-[15px]">{title}</h3>
      {description && (
        <p className="relative text-[13px] text-ink-400 mt-2 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
