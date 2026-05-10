import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, description, action, tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "brand" | "success";
}) {
  const toneCls =
    tone === "brand"   ? "from-brand-50 to-rose-50 dark:from-brand-500/10 dark:to-rose-500/10 text-brand-600 dark:text-brand-300 ring-brand-200/60 dark:ring-brand-500/30" :
    tone === "success" ? "from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-500/30" :
                         "from-ink-50 to-ink-100 dark:from-ink-800/60 dark:to-ink-800 text-ink-500 dark:text-ink-400 ring-ink-200/80 dark:ring-ink-700";
  return (
    <div className="text-center py-12 px-6 animate-fade-up">
      <div className={`relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${toneCls} flex items-center justify-center ring-1 ring-inset mb-4`}>
        <Icon className="w-8 h-8" />
        <span className="absolute -inset-1 rounded-2xl bg-current opacity-5 blur-md" />
      </div>
      <h3 className="font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      {description && <p className="text-sm text-ink-500 dark:text-ink-400 mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
