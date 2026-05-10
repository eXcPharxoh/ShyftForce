import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-6">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-ink-50 to-ink-100 text-ink-500
                      flex items-center justify-center ring-1 ring-inset ring-ink-200/80 mb-3">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-ink-900">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
