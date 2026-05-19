import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { VmTasksClient } from "@/components/retail/vm-tasks-client";
import { Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VmTasksPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = { organizationId: u.organizationId };
  if (!isManager) where.OR = [{ assignedToMemberId: u.memberId ?? "" }, { assignedToMemberId: null }];

  const [tasks, members, locations] = await Promise.all([
    prisma.vmTask.findMany({
      where,
      include: {
        assignedTo: { include: { user: { select: { name: true } } } },
        submissions: { orderBy: { submittedAt: "desc" }, take: 1, include: { member: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 200,
    }),
    isManager ? prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } },
    }) : [],
    isManager ? prisma.location.findMany({
      where: { organizationId: u.organizationId }, orderBy: { name: "asc" },
    }) : [],
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow={isManager ? "Retail · Manager" : "My tasks"}
        icon={ImageIcon}
        title="Visual merchandising"
        subtitle={isManager
          ? "Assign endcaps, window displays, and floor resets. Require photo proof for brand-compliance audits."
          : "Endcaps, displays, and resets assigned to you. Submit a photo when done."}
      />

      <VmTasksClient
        isManager={isManager}
        myMemberId={u.memberId ?? null}
        initial={tasks.map(t => ({
          id: t.id, name: t.name, description: t.description,
          dueDate: t.dueDate?.toISOString() ?? null,
          requirePhoto: t.requirePhoto, status: t.status,
          assignedToName: t.assignedTo?.user.name ?? null,
          assignedToMemberId: t.assignedToMemberId,
          lastSubmission: t.submissions[0] ? {
            memberName: t.submissions[0].member.user.name,
            photoData: t.submissions[0].photoData,
            notes: t.submissions[0].notes,
            submittedAt: t.submissions[0].submittedAt.toISOString(),
          } : null,
        }))}
        members={members.map(m => ({ id: m.id, name: m.user.name }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
