import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { FinchAPI } from "@/lib/finch";
import { audit } from "@/lib/audit";

// POST /api/finch/sync — pull workers from connected payroll provider, match to existing
// members by email, and store externalEmployeeId. New workers are surfaced for review.
export async function POST() {
  const u = await requireManagerOrAdmin();
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org?.finchAccessToken) return NextResponse.json({ error: "Finch not connected" }, { status: 400 });

  const workers = await FinchAPI.listWorkers(org.finchAccessToken);

  let matched = 0; let createdHints = 0;
  const unmatched: { id: string; name: string; email: string | null }[] = [];

  for (const w of workers) {
    const email = w.emails?.find(e => e.primary)?.data ?? w.emails?.[0]?.data ?? null;
    const fullName = `${w.first_name}${w.middle_name ? " " + w.middle_name : ""} ${w.last_name}`.trim();

    if (!email) {
      unmatched.push({ id: w.id, name: fullName, email: null });
      continue;
    }
    const member = await prisma.member.findFirst({
      where: { organizationId: org.id, user: { email } },
    });
    if (member) {
      await prisma.member.update({
        where: { id: member.id },
        data: { externalEmployeeId: w.id, payrollProvider: org.finchProviderId },
      });
      matched++;
    } else {
      unmatched.push({ id: w.id, name: fullName, email });
      createdHints++;
    }
  }

  await audit({
    organizationId: org.id, actorId: u.id,
    action: "org.update", entityType: "Finch.sync",
    metadata: { workersFound: workers.length, matched, unmatched: unmatched.length },
  });

  return NextResponse.json({
    workersFound: workers.length,
    matched,
    unmatched,            // surface so manager can decide to invite
    provider: org.finchProviderId,
  });
}
