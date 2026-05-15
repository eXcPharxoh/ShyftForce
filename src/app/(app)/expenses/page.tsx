import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtMoney, initials, relTime } from "@/lib/utils";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseActions } from "@/components/expenses/expense-actions";

export default async function ExpensesPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const requests = await prisma.expenseRequest.findMany({
    where: { member: { organizationId: u.organizationId } },
    include: { member: { include: { user: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });
  const pending = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");
  const totalPending = pending.reduce((a, r) => a + r.amount, 0);
  const totalApproved = approved.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <p className="text-sm text-ink-500">{requests.length} requests · {pending.length} awaiting review</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Pending" value={fmtMoney(totalPending)} note={`${pending.length} requests`} tone="amber" />
        <Stat label="Approved (this period)" value={fmtMoney(totalApproved)} note={`${approved.length} requests`} tone="emerald" />
        <Stat label="Avg request" value={fmtMoney(requests.length ? requests.reduce((a,r) => a + r.amount, 0) / requests.length : 0)} note="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent expense requests</h3>
          <ul className="divide-y divide-ink-100">
            {requests.map(r => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                {r.member.user.avatar ? <img src={r.member.user.avatar} className="w-9 h-9 rounded-full" alt="" /> : <div className="w-9 h-9 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(r.member.user.name)}</div>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{r.member.user.name}</span>
                    <span className="text-ink-500"> · {r.category ?? "general"}</span>
                  </div>
                  <div className="text-[11px] text-ink-500">{r.notes ?? "—"} · {relTime(r.createdAt)}</div>
                </div>
                <div className="text-right mr-3">
                  <div className="font-semibold tabular-nums">{fmtMoney(r.amount, r.currency)}</div>
                  <StatusBadge status={r.status} />
                </div>
                {isManager && r.status === "pending" && <ExpenseActions requestId={r.id} />}
              </li>
            ))}
            {requests.length === 0 && <li className="text-xs text-ink-500 py-4 text-center">No expense requests.</li>}
          </ul>
        </section>
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Submit an expense</h3>
          <ExpenseForm />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, tone = "ink" }: { label: string; value: string; note: string; tone?: "ink" | "amber" | "emerald" }) {
  const map: any = { ink: "text-ink-900 dark:text-ink-50", amber: "text-amber-700", emerald: "text-emerald-700" };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[tone]}`}>{value}</div>
      <div className="text-[11px] text-ink-500 mt-0.5">{note}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <span className="badge bg-amber-50 text-amber-700">Pending</span>;
  if (status === "approved") return <span className="badge bg-emerald-50 text-emerald-700">Approved</span>;
  return <span className="badge bg-rose-50 text-rose-700">Rejected</span>;
}
