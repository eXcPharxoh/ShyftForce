import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { relTime } from "@/lib/utils";
import { FileText } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "user.signup":              "Account created",
  "user.verify_email":        "Email verified",
  "user.password_reset":      "Password reset",
  "org.create":               "Workspace created",
  "org.update":               "Workspace updated",
  "member.invite":            "Member invited",
  "member.invite_accept":     "Invitation accepted",
  "shift.create":             "Shift created",
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

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.p ?? "1", 10));
  const pageSize = 50;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { createdAt: "desc" },
      include: { actor: true },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.auditLog.count({ where: { organizationId: u.organizationId } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Audit log
        </h1>
        <p className="text-sm text-ink-500">Every change in your workspace, immutable. {total.toLocaleString()} total events.</p>
      </header>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {logs.length === 0 && <li className="p-12 text-center text-sm text-ink-500">No events yet.</li>}
          {logs.map(l => {
            const meta = l.metadata ? safeParse(l.metadata) : null;
            const label = ACTION_LABELS[l.action] ?? l.action;
            return (
              <li key={l.id} className="px-4 py-2.5 text-sm flex items-start gap-3">
                <div className="w-1 h-1 rounded-full bg-brand-500 mt-2.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-medium">{label}</span>
                    {l.entityType && <span className="text-ink-500"> · {l.entityType}</span>}
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
          <div className="p-3 border-t border-ink-100 flex items-center justify-between text-xs">
            <span>Page {page} of {Math.ceil(total / pageSize)}</span>
            <div className="flex gap-2">
              {page > 1 && <a href={`/settings/audit?p=${page - 1}`} className="btn-outline text-xs">← Newer</a>}
              {page * pageSize < total && <a href={`/settings/audit?p=${page + 1}`} className="btn-outline text-xs">Older →</a>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return {}; } }
