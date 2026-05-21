import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase } from "lucide-react";
import { JobsClient } from "@/components/hr/jobs-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const u = await requireManagerOrAdmin();

  const [postings, locations] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { organizationId: u.organizationId },
      include: {
        location: { select: { name: true } },
        owner:    { include: { user: { select: { name: true } } } },
        _count:   { select: { applications: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.location.findMany({
      where: { organizationId: u.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const ids = postings.map(p => p.id);
  const buckets = ids.length === 0 ? [] : await prisma.jobApplication.groupBy({
    by: ["jobPostingId", "status"],
    where: { jobPostingId: { in: ids } },
    _count: { _all: true },
  });
  const counts: Record<string, Record<string, number>> = {};
  for (const row of buckets) {
    counts[row.jobPostingId] ??= {};
    counts[row.jobPostingId][row.status] = row._count._all;
  }

  const initial = postings.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    position: p.position,
    status: p.status as "draft" | "open" | "closed",
    employmentType: p.employmentType,
    payMin: p.payMin, payMax: p.payMax, payPeriod: p.payPeriod,
    locationId: p.locationId,
    locationName: p.location?.name ?? null,
    ownerName: p.owner?.user.name ?? null,
    publicToken: p.publicToken,
    startDate: p.startDate?.toISOString().slice(0, 10) ?? null,
    createdAt: p.createdAt.toISOString(),
    totalApplications: p._count.applications,
    byStatus: counts[p.id] ?? {},
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Hiring"
        icon={Briefcase}
        title="Job postings"
        subtitle="Post a role, share the public link anywhere, and review applicants without leaving shyftforce."
      />
      <JobsClient initial={initial} locations={locations} />
    </div>
  );
}
