import { prisma } from "./prisma";

export type AuditAction =
  | "user.signup" | "user.login" | "user.logout" | "user.password_reset" | "user.verify_email"
  | "org.create" | "org.update" | "org.upgrade_plan" | "org.cancel_subscription"
  | "org.suspend" | "org.restore"
  | "member.invite" | "member.invite_accept" | "member.role_change" | "member.deactivate"
  | "shift.create" | "shift.update" | "shift.delete" | "shift.publish"
  | "shift.auto_offer" | "shift.claim"
  | "timesheet.approve" | "timesheet.flag"
  | "time_off.create" | "time_off.approve" | "time_off.reject"
  | "expense.create" | "expense.approve" | "expense.reject"
  | "compliance.settings_update" | "compliance.update"
  | "billing.checkout" | "billing.subscription_active" | "billing.subscription_canceled"
  // Sprints added later (loose union — keeps lib generic for future modules)
  | "pos.connect" | "pos.disconnect" | "pos.manual_revenue"
  | "ewa.withdraw" | "ewa.settings_update"
  | "forecast.regenerate" | "forecast.apply" | "forecast.context_add" | "forecast.context_delete"
  | "network.post" | "network.cancel" | "network.claim"
  | "worker_profile.update"
  | "incident.create" | "incident.update"
  | "checkpoint.create" | "checkpoint.deactivate" | "checkpoint.scan"
  | "client.create" | "client.update" | "client.deactivate"
  | "tips.distribute";

export async function audit(opts: {
  organizationId: string;
  actorId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: opts.organizationId,
        actorId:        opts.actorId ?? null,
        action:         opts.action,
        entityType:     opts.entityType ?? null,
        entityId:       opts.entityId ?? null,
        metadata:       opts.metadata ? JSON.stringify(opts.metadata) : null,
        ipAddress:      opts.ipAddress ?? null,
        userAgent:      opts.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("audit log write failed (non-fatal):", e);
  }
}
