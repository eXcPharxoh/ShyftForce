import { cn } from "@/lib/utils";
import Link from "next/link";

export function WidgetCard({
  title, action, actionHref, span = 1, children, className,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  span?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  const spanCls = span === 3 ? "lg:col-span-3" : span === 2 ? "lg:col-span-2" : "";
  return (
    <section className={cn("card card-hover p-4", spanCls, className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
        {action && actionHref && (
          <Link href={actionHref} className="text-xs font-medium text-brand-600 hover:text-brand-700">{action}</Link>
        )}
      </div>
      {children}
    </section>
  );
}
