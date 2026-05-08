import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, initials, relTime } from "@/lib/utils";
import { TimeOffActions } from "@/components/time-off/time-off-actions";
import { TimeOffForm } from "@/components/time-off/time-off-form";

export default async function TimeOffPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const requests = await prisma.timeOffRequest.findMany({
    where: { member: { organizationId: u.organizationId } },
    include: { member: { include: { user: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");
  const rejected = requests.filter(r => r.status === "rejected");

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Off</h1>
          <p className="text-sm text-ink-500">{requests.length} total requests · {pending.length} pending</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <SummaryRow pending={pending.length} approved={approved.length} rejected={rejected.length} />

          {isManager ? (
            <Section title="Pending requests">
              {pending.length === 0 && <Empty text="Nothing waiting on you. Inbox zero. ✨" />}
              <ul className="divide-y divide-ink-100">
                {pending.map(r => (
                  <li key={r.id} className="py-3 flex items-center gap-3">
                    <Avatar name={r.member.user.name} src={r.member.user.avatar ?? undefined} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{r.member.user.name}</span>
                        <span className="text-ink-500"> · {r.member.position}</span>
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {dateLabel(r.startsOn)} → {dateLabel(r.endsOn)} · {r.category} · {relTime(r.createdAt)}
                      </div>
                      {r.reason && <div className="text-xs text-ink-700 mt-1">"{r.reason}"</div>}
                    </div>
                    <TimeOffActions requestId={r.id} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Section title="My requests">
              <ul className="divide-y divide-ink-100">
                {requests.filter(r => r.member.userId === u.id).map(r => (
                  <li key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</div>
                      <div className="text-[11px] text-ink-500">{r.category} · {relTime(r.createdAt)}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Recently approved">
            <ul className="divide-y divide-ink-100">
              {approved.slice(0, 5).map(r => (
                <li key={r.id} className="py-2.5 flex items-center gap-3">
                  <Avatar name={r.member.user.name} src={r.member.user.avatar ?? undefined} />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium">{r.member.user.name}</span>
                    <span className="text-ink-500"> · {dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</span>
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
      <Stat label="Pending" value={pending} tone="amber" />
      <Stat label="Approved" value={approved} tone="emerald" />
      <Stat label="Rejected" value={rejected} tone="rose" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "rose" }) {
  const map: any = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={`card p-3 ${map[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-ink-500 py-4 text-center">{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <span className="badge bg-amber-50 text-amber-700">Pending</span>;
  if (status === "approved") return <span className="badge bg-emerald-50 text-emerald-700">Approved</span>;
  return <span className="badge bg-rose-50 text-rose-700">Rejected</span>;
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-full" />;
  return <div className="w-9 h-9 rounded-full bg-ink-200 text-ink-700 text-xs font-semibold flex items-center justify-center">{initials(name)}</div>;
}
