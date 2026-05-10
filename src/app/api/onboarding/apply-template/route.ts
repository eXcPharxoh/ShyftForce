import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { templateByKey } from "@/lib/industry-templates";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  industry: z.string(),
  firstLocation: z.object({
    name: z.string().min(1),
    timezone: z.string().optional(),
  }).optional(),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tpl = templateByKey(parsed.data.industry);
  if (!tpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  // Update org with industry + recommended compliance tweaks
  await prisma.organization.update({ where: { id: u.organizationId }, data: { industry: tpl.key } });

  if (tpl.recommendedComplianceTweaks) {
    await prisma.complianceSettings.upsert({
      where: { organizationId: u.organizationId },
      update: tpl.recommendedComplianceTweaks,
      create: { organizationId: u.organizationId, ...tpl.recommendedComplianceTweaks },
    });
  }

  // Create first location if provided AND none exist yet
  const existingLocs = await prisma.location.count({ where: { organizationId: u.organizationId } });
  if (parsed.data.firstLocation && existingLocs === 0) {
    await prisma.location.create({
      data: {
        organizationId: u.organizationId,
        name: parsed.data.firstLocation.name,
        geofenceRadiusMeters: tpl.defaultGeofenceMeters,
      },
    });
  }

  // Promote sample HR reminders / day-notes
  const remindersCreated = await prisma.hRReminder.count({ where: { organizationId: u.organizationId } });
  if (remindersCreated === 0) {
    const due = new Date(); due.setDate(due.getDate() + 7);
    await prisma.hRReminder.createMany({
      data: [
        { organizationId: u.organizationId, title: `Set ${tpl.label} positions and shift templates`, dueOn: due },
        { organizationId: u.organizationId, title: "Invite your team", dueOn: due },
        { organizationId: u.organizationId, title: "Configure geofence radius for each site", dueOn: due },
      ],
    });
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: { template: tpl.key, positions: tpl.positions.length, shiftBlocks: tpl.shiftBlocks.length },
  });

  return NextResponse.json({
    ok: true,
    template: { key: tpl.key, label: tpl.label, positions: tpl.positions, shiftBlocks: tpl.shiftBlocks },
  });
}
