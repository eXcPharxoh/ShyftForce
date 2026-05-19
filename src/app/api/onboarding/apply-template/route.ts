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

  // 5. Vertical-specific default seeds (only seeded once per industry)
  let verticalSeeds = 0;
  if (tpl.key === "construction") {
    const existing = await prisma.crew.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      await prisma.crew.createMany({ data: [
        { organizationId: u.organizationId, name: "Crew A", color: "#f59e0b" },
        { organizationId: u.organizationId, name: "Crew B", color: "#ef4444" },
      ]});
      await prisma.equipment.createMany({ data: [
        { organizationId: u.organizationId, name: "Generator 7500W", category: "machine" },
        { organizationId: u.organizationId, name: "Air compressor", category: "machine" },
        { organizationId: u.organizationId, name: "Scaffolding kit", category: "scaffolding" },
        { organizationId: u.organizationId, name: "Hard hats (case of 12)", category: "safety_gear" },
      ]});
      verticalSeeds = 6;
    }
  } else if (tpl.key === "hospitality") {
    const existing = await prisma.hotelRoom.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      // Seed floors 1-2 with 10 rooms each
      const rooms = [];
      for (let floor = 1; floor <= 2; floor++) {
        for (let n = 1; n <= 10; n++) {
          rooms.push({ organizationId: u.organizationId, number: `${floor}0${n}`, floor, type: "standard", status: "clean" });
        }
      }
      await prisma.hotelRoom.createMany({ data: rooms });
      verticalSeeds = rooms.length;
    }
  } else if (tpl.key === "education") {
    const existing = await prisma.classPeriod.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      await prisma.classPeriod.createMany({ data: [
        { organizationId: u.organizationId, number: 1, name: "1st", startTime: "08:00", endTime: "08:50", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 2, name: "2nd", startTime: "08:55", endTime: "09:45", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 3, name: "3rd", startTime: "09:50", endTime: "10:40", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 4, name: "4th", startTime: "10:45", endTime: "11:35", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 5, name: "Lunch", startTime: "11:35", endTime: "12:15", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 6, name: "5th", startTime: "12:20", endTime: "13:10", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 7, name: "6th", startTime: "13:15", endTime: "14:05", daysOfWeek: "[1,2,3,4,5]" },
        { organizationId: u.organizationId, number: 8, name: "7th", startTime: "14:10", endTime: "15:00", daysOfWeek: "[1,2,3,4,5]" },
      ]});
      verticalSeeds = 8;
    }
  } else if (tpl.key === "grocery") {
    const existing = await prisma.department.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      const groceryDepts = ["Produce", "Deli", "Bakery", "Meat", "Dairy", "Frozen", "Grocery", "Front-End"];
      const colors = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#6366f1", "#84cc16", "#ec4899"];
      await prisma.department.createMany({
        data: groceryDepts.map((name, i) => ({ organizationId: u.organizationId, name, color: colors[i] })),
      });
      verticalSeeds = groceryDepts.length;
    }
  } else if (tpl.key === "retail") {
    const existing = await prisma.department.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      const retailDepts = ["Sales Floor", "Cashier", "Fitting Room", "Stockroom", "Visual Merch"];
      const colors = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      await prisma.department.createMany({
        data: retailDepts.map((name, i) => ({ organizationId: u.organizationId, name, color: colors[i] })),
      });
      verticalSeeds = retailDepts.length;
    }
  } else if (tpl.key === "fitness") {
    const existing = await prisma.fitnessClass.count({ where: { organizationId: u.organizationId } });
    if (existing === 0) {
      await prisma.fitnessClass.createMany({ data: [
        { organizationId: u.organizationId, name: "Yoga", durationMins: 60, capacity: 20, color: "#10b981" },
        { organizationId: u.organizationId, name: "Spin", durationMins: 45, capacity: 24, color: "#ef4444" },
        { organizationId: u.organizationId, name: "HIIT", durationMins: 30, capacity: 16, color: "#f59e0b" },
        { organizationId: u.organizationId, name: "Pilates", durationMins: 50, capacity: 12, color: "#8b5cf6" },
      ]});
      verticalSeeds = 4;
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
      verticalSeeds,
    },
  });

  return NextResponse.json({
    ok: true,
    template: { key: tpl.key, label: tpl.label, positions: tpl.positions, shiftBlocks: tpl.shiftBlocks },
    sampleShiftsCreated,
    sampleDayNotesCreated,
    verticalSeeds,
  });
}
