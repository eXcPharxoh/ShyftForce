"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tab strip with an animated sliding indicator. Step up from the .segmented
 * CSS utility when:
 *   - The active tab is stateful (React state, not just URL)
 *   - You want the indicator to slide between tabs rather than instantly
 *     re-color
 *   - Tabs need richer content (icon + label + count badge)
 *
 *   const [tab, setTab] = useState("week");
 *   <Tabs
 *     value={tab}
 *     onChange={setTab}
 *     options={[
 *       { value: "week", label: "This week", count: 12 },
 *       { value: "month", label: "This month", count: 47 },
 *       { value: "all", label: "All time" },
 *     ]}
 *   />
 */
export type TabOption = {
  value: string;
  label: ReactNode;
  /** Optional small badge to the right (e.g. count) */
  count?: number;
  /** Optional left icon */
  icon?: ReactNode;
  disabled?: boolean;
};

export function Tabs({
  value,
  onChange,
  options,
  className = "",
  fullWidth = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
  className?: string;
  /** If true, tabs expand evenly across container width */
  fullWidth?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number; height: number } | null>(null);

  // Measure the active tab on every value change or layout shift and
  // position the indicator to match. useLayoutEffect (not useEffect)
  // so the indicator renders in the right place on the first paint
  // without a flash.
  useLayoutEffect(() => {
    const activeEl = tabRefs.current.get(value);
    const wrapEl = wrapRef.current;
    if (!activeEl || !wrapEl) return;
    const wrapRect = wrapEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - wrapRect.left,
      width: tabRect.width,
      height: tabRect.height,
    });
  }, [value, options.length]);

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex items-center p-1 rounded-md border border-white/[0.06] bg-white/[0.02] gap-0.5 ${fullWidth ? "w-full" : ""} ${className}`}
      role="tablist"
    >
      {/* Sliding indicator — single absolutely-positioned div behind
          the active tab. Transition driven by CSS so we get GPU-
          accelerated smooth motion without a JS animation loop. */}
      {indicator && (
        <span
          aria-hidden
          className="absolute rounded transition-all duration-[220ms] pointer-events-none"
          style={{
            left: indicator.left,
            width: indicator.width,
            height: indicator.height,
            background: "linear-gradient(180deg, rgba(106,162,255,0.18) 0%, rgba(106,162,255,0.10) 100%)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px 0 rgba(0,0,0,0.2), 0 0 0 1px rgba(106,162,255,0.25)",
            transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      )}

      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) tabRefs.current.set(o.value, el);
              else tabRefs.current.delete(o.value);
            }}
            role="tab"
            aria-selected={isActive}
            disabled={o.disabled}
            onClick={() => !o.disabled && onChange(o.value)}
            className={`
              relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium
              transition-colors duration-150 cursor-pointer whitespace-nowrap
              ${fullWidth ? "flex-1 justify-center" : ""}
              ${o.disabled ? "opacity-40 cursor-not-allowed" : isActive ? "text-brand-200" : "text-ink-300 hover:text-ink-50"}
            `}
          >
            {o.icon}
            <span>{o.label}</span>
            {o.count !== undefined && (
              <span className={`text-[10px] tabular-nums px-1.5 py-px rounded-full ${isActive ? "bg-brand-500/25 text-brand-100" : "bg-white/[0.06] text-ink-400"}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
