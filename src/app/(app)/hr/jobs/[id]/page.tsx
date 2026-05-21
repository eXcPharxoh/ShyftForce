import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ApplicationsClient } from "@/components/hr/applications-client";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const p = await prisma.jobPosting.findFirst({
    where: { id, organizationId: u.organizationId },
    include: {
      location: { select: { id: true, name: true } },
      owner:    { include: { user: { select: { name: true } } } },
    },
  });
  if (!p) notFound();

  const [apps, locations] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { jobPostingId: id },
      include: { reviewer: { include: { user: { select: { name: true } } } } },
      orderBy: { appliedAt: "desc" },
      take: 500,
    }),
    prisma.location.findMany({
      where: { organizationId: u.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial = apps.map(a => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    resumeText: a.resumeText,
    coverLetter: a.coverLetter,
    source: a.source,
    status: a.status as "new" | "screen" | "interview" | "offer" | "hired" | "rejected",
    reviewerName: a.reviewer?.user.name ?? null,
    notes: a.notes,
    appliedAt: a.appliedAt.toISOString(),
    hiredAt: a.hiredAt?.toISOString() ?? null,
    rejectedAt: a.rejectedAt?.toISOString() ?? null,
    rejectionReason: a.rejectionReason,
    invitationId: a.invitationId,
  }));

  const publicUrl = `/apply/${p.publicToken}`;

  return (
    <div className="space-y-5">
      <Link href="/hr/jobs" className="inline-flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-300 transition">
        <ArrowLeft className="w-3 h-3" /> All postings
      </Link>

      <PageHeader
        eyebrow={p.status === "open" ? "Active posting" : p.status === "closed" ? "Closed" : "Draft"}
        icon={Briefcase}
        title={p.title}
        subtitle={
          <span>
            {p.position && <>{p.position} · </>}
            {p.location?.name && <>{p.location.name} · </>}
            {apps.length} application{apps.length === 1 ? "" : "s"}
          </span>
        }
      >
        {p.status === "open" && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
            Public link →
          </a>
        )}
      </PageHeader>

      <ApplicationsClient
        postingId={id}
        defaultPosition={p.position}
        defaultLocationId={p.locationId}
        initial={initial}
        locations={locations}
        initialStage={sp.stage}
      />
    </div>
  );
}
