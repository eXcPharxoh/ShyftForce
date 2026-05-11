import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { templateByKey } from "@/lib/industry-templates";
import { audit } from "@/lib/audit";
import { addDays, startOfWeek } from "@/lib/utils";
import { z } from "zod";

const Schema = z.object({
  industry: z.string(),
  firstLocation: z.object({
    name: z.string().min(1),
    timezone: z.string().optional(),
  }).optional(),
  seedSampleData: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tpl = templateByKey(parsed.data.industry);
  if (!tpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  // 1. Update org with industry + recommended compliance tweaks
  await prisma.organization.update({ where: { id: u.organizationId }, data: { industry: tpl.key } });
  if (tpl.recommendedComplianceTweaks) {
    await prisma.complianceSettings.upsert({
      where: { organizationId: u.organizationId },
      update: tpl.recommendedComplianceTweaks,
      create: { organizationId: u.organizationId, ...tpl.recommendedComplianceTweaks },
    });
  }

  // 2. Create first location if provided (or use existing)
  let firstLocation = await prisma.location.findFirst({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "asc" },
  });
  if (!firstLocation && parsed.data.firstLocation) {
    firstLocation = await prisma.location.create({
      data: {
        organizationId: u.organizationId,
        name: parsed.data.firstLocation.name,
        geofenceRadiusMeters: tpl.defaultGeofenceMeters,
      },
    });
  }

  // 3. HR reminders (only if none exist yet)
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

  // 4. Sample data for empty trials — gives users immediate visual feedback
  let sampleShiftsCreated = 0;
  let sampleDayNotesCreated = 0;
  if (parsed.data.seedSampleData && firstLocation) {
    // Sample day notes for the current week
    const existingNotes = await prisma.dayNote.count({
      where: { organizationId: u.organizationId, locationId: firstLocation.id },
    });
    if (existingNotes === 0 && tpl.dayNoteSamples.length > 0) {
      const weekStart = startOfWeek(new Date());
      const adminMember = await prisma.member.findFirst({
        where: { organizationId: u.organizationId, userId: u.id },
      });
      if (adminMember) {
        for (let i = 0; i < Math.min(tpl.dayNoteSamples.length, 4); i++) {
          await prisma.dayNote.create({
            data: {
              organizationId: u.organizationId,
              locationId: firstLocation.id,
              date: addDays(weekStart, i + 1),
              body: tpl.dayNoteSamples[i],
              authorId: adminMember.id,
            },
          });
          sampleDayNotesCreated++;
        }
      }
    }

    // Sample DRAFT shifts for next week — uses template's shift blocks + positions
    // Manager will fill in real members; this gives them a starting grid + something to see.
    const nextWeekStart = addDays(startOfWeek(new Date()), 7);
    const existingShifts = await prisma.shift.count({
      where: { locationId: firstLocation.id, startsAt: { gte: nextWeekStart, lt: addDays(nextWeekStart, 7) } },
    });
    if (existingShifts === 0) {
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const day = addDays(nextWeekStart, dayOffset);
        // Use the first 2-3 shift blocks per day (most templates have 3-4)
        const blocksToUse = tpl.shiftBlocks.slice(0, Math.min(3, tpl.shiftBlocks.length));
        for (let bi = 0; bi < blocksToUse.length; bi++) {
          const block = blocksToUse[bi];
          const position = tpl.positions[bi % tpl.positions.length];
          const [sh, sm] = block.startTime.split(":").map(Number);
          const [eh, em] = block.endTime.split(":").map(Number);
          const startsAt = new Date(day); startsAt.setHours(sh, sm, 0, 0);
          let endsAt = new Date(day); endsAt.setHours(eh, em, 0, 0);
          // Overnight shifts wrap into next day
          if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 3600_000);
          await prisma.shift.create({
            data: {
              locationId: firstLocation.id,
              startsAt,
              endsAt,
              position,
              status: "draft",
              isOpen: true,
              notes: `Sample ${block.name} shift — drag a teammate here to assign`,
            },
          });
          sampleShiftsCreated++;
        }
      }
    }
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: {
      template: tpl.key,
      positions: tpl.positions.length,
      shiftBlocks: tpl.shiftBlocks.length,
      sampleShiftsCreated,
      sampleDayNotesCreated,
    },
  });

  return NextResponse.json({
    ok: true,
    template: { key: tpl.key, label: tpl.label, positions: tpl.positions, shiftBlocks: tpl.shiftBlocks },
    sampleShiftsCreated,
    sampleDayNotesCreated,
  });
}
