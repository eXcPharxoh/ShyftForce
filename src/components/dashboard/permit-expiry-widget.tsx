import { listPermits } from "@/lib/permits/service";
import { permitLabel } from "@/lib/permits/catalog";
import { ShieldAlert, AlertOctagon, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

// Security-vertical dashboard card. Shows the next 90 days of permit
// expirations with severity colors + per-row renew CTA. Hidden when the
// org has no permits configured at all.
export async function PermitExpiryWidget({ organizationId }: { organizationId: string }) {
  const items = await listPermits(organizationId);
  if (items.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold">Permits & licences</h3>
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Track agency + guard permit expirations. We'll auto-text reminders at 60, 30, 14, 7 days and lock expired guards out of new shifts.
        </p>
        <Link href="/settings/permits" className="btn-primary text-xs">
          + Add first permit
        </Link>
      </div>
    );
  }

  // Show only the ones expiring in the next 90 days (or already expired)
  const relevant = items.filter(p => p.daysUntilExpiry <= 90);
  if (relevant.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold">Permits & licences</h3>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          All {items.length} permit{items.length === 1 ? "" : "s"} good for &gt; 90 days. 👍
        </p>
      </div>
    );
  }

  const expired   = relevant.filter(p => p.status === "expired");
  const urgent    = relevant.filter(p => p.status === "expiring_urgent");
  const soon      = relevant.filter(p => p.status === "expiring_soon");

  return (
    <div className={`card p-5 ${expired.length > 0 ? "border-rose-200 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/5" : urgent.length > 0 ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-500/5" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expired.length > 0 ? "bg-rose-500 text-white" : urgent.length > 0 ? "bg-amber-500 text-white" : "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"}`}>
            {expired.length > 0 ? <AlertOctagon className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Permits & licences</h3>
            <p className="text-[11px] text-ink-500">
              {expired.length > 0 && <span className="text-rose-600 font-semibold">{expired.length} EXPIRED · </span>}
              {urgent.length > 0 && <span>{urgent.length} expiring &le;7d · </span>}
              {soon.length > 0 && <span>{soon.length} expiring &le;30d</span>}
            </p>
          </div>
        </div>
        <Link href="/settings/permits" className="text-xs text-brand-600 dark:text-brand-400 font-medium">All permits →</Link>
      </div>

      <ul className="space-y-2">
        {relevant.slice(0, 6).map(p => (
          <li key={p.id} className={`rounded-xl border p-3 ${rowToneFor(p.status)}`}>
            <div className="flex items-start gap-3">
              <SeverityIcon status={p.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">
                    {permitLabel({ category: p.category, customLabel: p.customLabel })}
                  </span>
                  {!p.memberId && <span className="badge-orange text-[10px]">agency</span>}
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-0.5">
                  {p.memberName ? <><b>{p.memberName}</b> · </> : null}
                  {p.status === "expired"
                    ? <span className="text-rose-600 font-semibold">EXPIRED {-p.daysUntilExpiry}d ago</span>
                    : p.daysUntilExpiry === 0
                      ? <span className="text-rose-600 font-semibold">Expires TODAY</span>
                      : <>Expires in <b>{p.daysUntilExpiry}d</b> · {p.expiresOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                  {p.regulator && <span className="text-ink-500"> · {p.regulator}</span>}
                </div>
              </div>
              {p.renewalUrl && (
                <a href={p.renewalUrl} target="_blank" rel="noopener" className="btn-outline text-xs shrink-0">
                  Renew <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {relevant.length > 6 && (
        <p className="text-[11px] text-ink-500 mt-2 text-center">+ {relevant.length - 6} more — see Settings → Permits</p>
      )}
    </div>
  );
}

function SeverityIcon({ status }: { status: string }) {
  if (status === "expired")          return <div className="shrink-0 w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center"><AlertOctagon className="w-4 h-4" /></div>;
  if (status === "expiring_urgent")  return <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>;
  if (status === "expiring_soon")    return <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center"><ShieldAlert className="w-4 h-4" /></div>;
  return <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>;
}

function rowToneFor(status: string): string {
  if (status === "expired")         return "border-rose-200 dark:border-rose-500/30 bg-white/60 dark:bg-rose-500/5";
  if (status === "expiring_urgent") return "border-amber-200 dark:border-amber-500/30 bg-white/60 dark:bg-amber-500/5";
  return "border-ink-200 dark:border-ink-800 bg-white/40 dark:bg-ink-900/40";
}
