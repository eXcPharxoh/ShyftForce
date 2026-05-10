import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title, subtitle, icon: Icon, eyebrow, children, className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-3 animate-fade-up", className)}>
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">{eyebrow}</div>
        )}
        <h1 className="h-page flex items-center gap-2.5">
          {Icon && (
            <span className="inline-flex w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 items-center justify-center ring-1 ring-inset ring-brand-200/60 dark:ring-brand-500/30">
              <Icon className="w-5 h-5" />
            </span>
          )}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400 mt-1.5 max-w-prose">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
}
