import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function WidgetCard({
  title, action, actionHref, span = 1, children, className, accent,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  span?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
  accent?: "brand" | "emerald" | "rose" | "amber" | null;
}) {
  const spanCls = span === 3 ? "lg:col-span-3" : span === 2 ? "lg:col-span-2" : "";
  const accentBar =
    accent === "brand"   ? "bg-brand-500" :
    accent === "emerald" ? "bg-emerald-500" :
    accent === "rose"    ? "bg-rose-500" :
    accent === "amber"   ? "bg-amber-500" : "";
  return (
    <section className={cn("relative card card-hover p-5 group overflow-hidden", spanCls, className)}>
      {accent && <span className={cn("absolute top-0 left-0 right-0 h-0.5", accentBar)} />}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[13px] font-semibold text-ink-700 uppercase tracking-wider">{title}</h3>
        {action && actionHref && (
          <Link
            href={actionHref}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700
                       inline-flex items-center gap-0.5 transition-all group/cta"
          >
            {action} <ArrowUpRight className="w-3 h-3 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
