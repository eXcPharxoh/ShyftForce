// Custom-role permission catalog + checker.
//
// Two layers:
//   1. Built-in role (ADMIN | MANAGER | EMPLOYEE) — implicit grants
//   2. Custom roles assigned to the member — additive only
//
// Checks union both. We never let custom roles DOWNGRADE a built-in role —
// they only grant capabilities the built-in role didn't already have.

import { prisma } from "@/lib/prisma";

export const PERMISSION_CATALOG = [
  // Scheduling
  { key: "schedule.read",      group: "Schedule",   label: "View schedule" },
  { key: "schedule.write",     group: "Schedule",   label: "Create / edit shifts" },
  { key: "schedule.publish",   group: "Schedule",   label: "Publish weeks" },
  { key: "schedule.delete",    group: "Schedule",   label: "Delete shifts" },
  // Members
  { key: "members.read",       group: "Members",    label: "View members + profiles" },
  { key: "members.invite",     group: "Members",    label: "Invite new members" },
  { key: "members.edit",       group: "Members",    label: "Edit member profiles" },
  { key: "members.deactivate", group: "Members",    label: "Deactivate members" },
  // Timesheets + payroll
  { key: "timesheets.read",    group: "Timesheets", label: "View timesheets" },
  { key: "timesheets.approve", group: "Timesheets", label: "Approve / flag timesheets" },
  { key: "payroll.run",        group: "Timesheets", label: "Push to payroll provider" },
  // Time-off
  { key: "timeoff.read",       group: "Time off",   label: "View time-off requests" },
  { key: "timeoff.approve",    group: "Time off",   label: "Approve / reject time-off" },
  // Compliance
  { key: "compliance.read",    group: "Compliance", label: "View compliance violations" },
  { key: "compliance.write",   group: "Compliance", label: "Edit compliance settings" },
  // Reports + audit
  { key: "reports.read",       group: "Reports",    label: "View reports + analytics" },
  { key: "audit.read",         group: "Reports",    label: "View audit log" },
  // Billing
  { key: "billing.read",       group: "Billing",    label: "View billing + invoices" },
  { key: "billing.write",      group: "Billing",    label: "Change plan / payment" },
  // Workspace settings
  { key: "settings.locations",   group: "Settings", label: "Manage locations" },
  { key: "settings.integrations",group: "Settings", label: "Manage integrations" },
  { key: "settings.api_keys",    group: "Settings", label: "Manage API keys" },
  { key: "settings.webhooks",    group: "Settings", label: "Manage webhooks" },
  // Training
  { key: "training.author",    group: "Training",   label: "Create / edit courses" },
] as const;

export type Permission = typeof PERMISSION_CATALOG[number]["key"];

// Built-in role → implicit permissions
const ADMIN_GRANTS: Permission[] = PERMISSION_CATALOG.map(p => p.key);
const MANAGER_GRANTS: Permission[] = [
  "schedule.read", "schedule.write", "schedule.publish", "schedule.delete",
  "members.read", "members.invite", "members.edit",
  "timesheets.read", "timesheets.approve", "payroll.run",
  "timeoff.read", "timeoff.approve",
  "compliance.read",
  "reports.read", "audit.read",
  "training.author",
];
const EMPLOYEE_GRANTS: Permission[] = [
  "schedule.read", "members.read", "timesheets.read", "timeoff.read",
];

export function permissionsForBuiltinRole(role: "ADMIN" | "MANAGER" | "EMPLOYEE" | string): Permission[] {
  if (role === "ADMIN")    return ADMIN_GRANTS;
  if (role === "MANAGER")  return MANAGER_GRANTS;
  return EMPLOYEE_GRANTS;
}

/** Compute effective permissions for a member = built-in role ∪ assigned custom roles. */
export async function effectivePermissions(memberId: string): Promise<Set<Permission>> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      role: true,
      customRoleAssignments: { include: { customRole: { select: { permissions: true } } } },
    },
  });
  if (!member) return new Set();

  const set = new Set<Permission>(permissionsForBuiltinRole(member.role));
  for (const a of member.customRoleAssignments) {
    try {
      const perms = JSON.parse(a.customRole.permissions) as Permission[];
      for (const p of perms) set.add(p);
    } catch {}
  }
  return set;
}

export async function hasPermission(memberId: string, permission: Permission | Permission[]): Promise<boolean> {
  const perms = await effectivePermissions(memberId);
  const need = Array.isArray(permission) ? permission : [permission];
  return need.every(p => perms.has(p));
}
