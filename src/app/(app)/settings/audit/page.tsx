import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { relTime } from "@/lib/utils";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

const ACTION_LABELS: Record<string, string> = {
  "user.signup":              "Account created",
  "user.verify_email":        "Email verified",
  "user.password_reset":      "Password reset",
  "org.create":               "Workspace created",
  "org.update":               "Workspace updated",
  "member.invite":            "Member invited",
  "member.invite_accept":     "Invitation accepted",
  "shift.create":             "Shift created",
  "shift.update":             "Shift updated",
  "shift.delete":             "Shift deleted",
  "shift.publish":            "Schedule published",
  "shift.auto_offer":         "Open shift offered",
  "shift.claim":              "Open shift claimed",
  "timesheet.approve":        "Timesheet approved",
  "time_off.approve":         "Time off approved",
  "time_off.reject":          "Time off rejected",
  "expense.approve":          "Expense approved",
  "expense.reject":           "Expense rejected",
  "compliance.settings_update": "Compliance rules changed",
  "billing.checkout":         "Checkout started",
  "billing.subscription_active":   "Subscription activated",
  "billing.subscription_canceled": "Subscription canceled",
};

// Entity-type filters surfaced as buttons. Each maps to entityType
// values used by the audit() helper across all the new modules.
const ENTITY_FILTERS = [
  { v: "",                       l: "All" },
  { v: "Shift",                  l: "Shifts" },
  { v: "Permit",                 l: "Permits" },
  // Healthcare
  { v: "PatientRatioRule",       l: "Patient ratios" },
  { v: "ShiftDifferential",      l: "Differentials" },
  { v: "OnCallShift",            l: "On-call" },
  // Field service
  { v: "Vehicle",                l: "Vehicles" },
  { v: "VehicleAssignment",      l: "Vehicle assigns" },
  { v: "JobCloseout",            l: "Job closeouts" },
  // Grocery/Retail
  { v: "Department",             l: "Departments" },
  { v: "PosLane",                l: "Cashier lanes" },
  { v: "LaneAssignment",         l: "Lane assigns" },
  { v: "ShrinkEvent",            l: "Shrink" },
  { v: "VmTask",                 l: "VM tasks" },
  { v: "VmTaskSubmission",       l: "VM submissions" },
  { v: "LossPreventionEvent",    l: "Loss prevention" },
  // Office
  { v: "HotDesk",                l: "Hot desks" },
  { v: "HotDeskBooking",         l: "Desk bookings" },
  { v: "MeetingRoom",            l: "Meeting rooms" },
  { v: "MeetingRoomBooking",     l: "Room bookings" },
  { v: "Visitor",                l: "Visitors" },
  // Fitness
  { v: "FitnessClass",           l: "Class templates" },
  { v: "ClassOccurrence",        l: "Class sessions" },
  { v: "PtSession",              l: "PT sessions" },
  // Construction
  { v: "Crew",                   l: "Crews" },
  { v: "Equipment",              l: "Equipment" },
  { v: "SafetyBriefing",         l: "Safety briefings" },
  // Hospitality
  { v: "HotelRoom",              l: "Hotel rooms" },
  { v: "HotelRoomAssignment",    l: "Room assigns" },
  { v: "LostFoundItem",          l: "Lost & found" },
  // Education
  { v: "SubPoolMember",          l: "Sub pool" },
  { v: "SubCallout",             l: "Sub callouts" },
  { v: "ClassPeriod",            l: "Bell schedule" },
  { v: "ConferenceSlot",         l: "Conf slots" },
  { v: "ConferenceBooking",      l: "Conf bookings" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ p?: string; type?: string; q?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.p ?? "1", 10));
  const typeFilter = sp.type ?? "";
  const q = sp.q ?? "";
  const pageSize = 50;

  const where: any = { organizationId: u.organizationId };
  if (typeFilter) where.entityType = typeFilter;
  if (q) where.OR = [
    { action: { contains: q } },
    { entityType: { contains: q } },
    { actor: { name: { contains: q } } },
  ];

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: "desc" },
      include: { actor: true },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  function buildHref(params: Partial<{ p: number; type: string; q: string }>): string {
    const sp = new URLSearchParams();
    const pp = params.p ?? 1;
    const tt = params.type ?? typeFilter;
    const qq = params.q ?? q;
    if (pp > 1) sp.set("p", String(pp));
    if (tt)     sp.set("type", tt);
    if (qq)     sp.set("q", qq);
    const s = sp.toString();
    return `/settings/audit${s ? `?${s}` : ""}`;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Trust & security"
        icon={FileText}
        title="Audit log"
        subtitle={`Every change in your workspace, immutable. ${total.toLocaleString()} matching event${total === 1 ? "" : "s"}.`}
      />

      {/* Filters */}
      <section className="card p-3 space-y-3">
        <form action="/settings/audit" method="get" className="flex gap-2 items-center">
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search action, entity type, or actor name…"
            className="input flex-1"
          />
          <button type="submit" className="btn-outline text-sm">Search</button>
          {q && <Link href={buildHref({ q: "", p: 1 })} className="btn-ghost text-xs">Clear</Link>}
        </form>
        <div className="flex flex-wrap gap-1 -mt-1">
          {ENTITY_FILTERS.map(f => (
            <Link
              key={f.v}
              href={buildHref({ type: f.v, p: 1 })}
              className={`text-[11px] px-2 py-1 rounded-full transition ${
                typeFilter === f.v
                  ? "bg-brand-500 text-white"
                  : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700"
              }`}
            >
              {f.l}
            </Link>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {logs.length === 0 && <li className="p-12 text-center text-sm text-ink-500">No events match these filters.</li>}
          {logs.map(l => {
            const meta = l.metadata ? safeParse(l.metadata) : null;
            const label = ACTION_LABELS[l.action] ?? l.action;
            return (
              <li key={l.id} className="px-4 py-2.5 text-sm flex items-start gap-3">
                <div className="w-1 h-1 rounded-full bg-brand-500 mt-2.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-medium">{label}</span>
                    {l.entityType && (
                      <Link href={buildHref({ type: l.entityType, p: 1 })} className="text-ink-500 hover:text-brand-600 ml-1.5">· {l.entityType}</Link>
                    )}
                  </div>
                  {meta && Object.keys(meta).length > 0 && (
                    <div className="text-[11px] text-ink-500 truncate">
                      {Object.entries(meta).slice(0, 4).map(([k, v]) => `${k}=${typeof v === "string" ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40)}`).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-right text-[11px] text-ink-500 shrink-0">
                  <div>{l.actor?.name ?? "system"}</div>
                  <div>{relTime(l.createdAt)}</div>
                </div>
              </li>
            );
          })}
        </ul>
        {total > pageSize && (
          <div className="p-3 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between text-xs">
            <span>Page {page} of {Math.ceil(total / pageSize)}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildHref({ p: page - 1 })} className="btn-outline text-xs">← Newer</Link>}
              {page * pageSize < total && <Link href={buildHref({ p: page + 1 })} className="btn-outline text-xs">Older →</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return {}; } }
