import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, initials, relTime } from "@/lib/utils";
import { TimeOffActions } from "@/components/time-off/time-off-actions";
import { TimeOffForm } from "@/components/time-off/time-off-form";
import { PageHeader } from "@/components/ui/page-header";
import { PtoBalanceCard } from "@/components/pto/balance-card";
import { snapshotForMember } from "@/lib/pto/service";
import { Moon } from "lucide-react";

export default async function TimeOffPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const [requests, balances] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: { member: { organizationId: u.organizationId } },
      include: { member: { include: { user: true, location: true } } },
      orderBy: { createdAt: "desc" },
    }),
    snapshotForMember(u.memberId, u.organizationId),
  ]);

  const pending  = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");
  const rejected = requests.filter(r => r.status === "rejected");

  // For manager: precompute the requester's available balance per pending request
  const requesterIds = [...new Set(pending.map(r => r.memberId))];
  const requesterBalances = new Map<string, Awaited<ReturnType<typeof snapshotForMember>>>();
  if (isManager) {
    await Promise.all(requesterIds.map(async mid => {
      requesterBalances.set(mid, await snapshotForMember(mid, u.organizationId));
    }));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Leave management"
        icon={Moon}
        title="Time Off"
        subtitle={`${requests.length} total request${requests.length === 1 ? "" : "s"} · ${pending.length} pending`}
      />

      <PtoBalanceCard balances={balances} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <SummaryRow pending={pending.length} approved={approved.length} rejected={rejected.length} />

          {isManager ? (
            <Section title="Pending requests">
              {pending.length === 0 && <Empty text="Nothing waiting on you. Inbox zero. ✨" />}
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {pending.map(r => {
                  const memberBal = requesterBalances.get(r.memberId)?.find(b => b.category === r.category);
                  const willGoNegative = memberBal && !memberBal.unlimited && (memberBal.available - (r.hoursRequested ?? 0)) < 0;
                  return (
                    <li key={r.id} className="py-3 flex items-center gap-3">
                      <Avatar name={r.member.user.name} src={r.member.user.avatar ?? undefined} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium text-ink-900 dark:text-ink-100">{r.member.user.name}</span>
                          <span className="text-ink-500 dark:text-ink-400"> · {r.member.position}</span>
                        </div>
                        <div className="text-[11px] text-ink-500 dark:text-ink-400 flex items-center gap-1.5 flex-wrap">
                          <span>{dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</span>
                          <span className="text-ink-400">·</span>
                          <span className="badge-gray">{r.category}</span>
                          {r.hoursRequested != null && (
                            <>
                              <span className="text-ink-400">·</span>
                              <span className={willGoNegative ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>
                                {r.hoursRequested.toFixed(0)}h requested
                                {memberBal && !memberBal.unlimited && (
                                  <> (balance {memberBal.available.toFixed(0)}h{willGoNegative ? " — INSUFFICIENT" : ""})</>
                                )}
                              </span>
                            </>
                          )}
                          <span className="text-ink-400">·</span>
                          <span>{relTime(r.createdAt)}</span>
                        </div>
                        {r.reason && <div className="text-xs text-ink-700 dark:text-ink-300 mt-1">"{r.reason}"</div>}
                      </div>
                      <TimeOffActions requestId={r.id} />
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : (
            <Section title="My requests">
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {requests.filter(r => r.member.userId === u.id).map(r => (
                  <li key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink-900 dark:text-ink-100">{dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">
                        <span className="badge-gray">{r.category}</span>
                        {r.hoursRequested != null && <> · {r.hoursRequested.toFixed(0)}h</>}
                        <span> · {relTime(r.createdAt)}</span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
                {requests.filter(r => r.member.userId === u.id).length === 0 && <Empty text="No requests yet. Submit one on the right." />}
              </ul>
            </Section>
          )}

          <Section title="Recently approved">
            {approved.length === 0 && <Empty text="No recent approvals." />}
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {approved.slice(0, 5).map(r => (
                <li key={r.id} className="py-2.5 flex items-center gap-3">
                  <Avatar name={r.member.user.name} src={r.member.user.avatar ?? undefined} />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium text-ink-900 dark:text-ink-100">{r.member.user.name}</span>
                    <span className="text-ink-500 dark:text-ink-400"> · {dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</span>
                    {r.hoursDeducted != null && <span className="text-ink-500 dark:text-ink-400"> · {r.hoursDeducted.toFixed(0)}h deducted</span>}
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div>
          <Section title="Submit a request"><TimeOffForm /></Section>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ pending, approved, rejected }: { pending: number; approved: number; rejected: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Pending"  value={pending}  tone="amber" />
      <Stat label="Approved" value={approved} tone="emerald" />
      <Stat label="Rejected" value={rejected} tone="rose" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "rose" }) {
  const map: any = {
    amber:   "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rose:    "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <div className={`card p-3 ${map[tone]}`}>
      <div className="text-2xl font-bold tracking-tight-2">{value}</div>
      <div className="text-xs font-semibold">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-ink-500 dark:text-ink-400 py-4 text-center">{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")  return <span className="badge-amber">Pending</span>;
  if (status === "approved") return <span className="badge-green">Approved</span>;
  return <span className="badge-red">Rejected</span>;
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-full" />;
  return <div className="w-9 h-9 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-xs font-semibold flex items-center justify-center">{initials(name)}</div>;
}
