import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { templateByKey } from "@/lib/industry-templates";
import { audit } from "@/lib/audit";
import { addDays, startOfWeek } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geo/geocode";
import { z } from "zod";

const Schema = z.object({
  industry: z.string(),
  firstLocation: z.object({
    name: z.string().min(1),
    timezone: z.string().optional(),
    address: z.string().max(300).optional(), // we'll geocode if provided
  }).optional(),
  seedSampleData: z.boolean().optional().default(true),
  // Customizations from the editable Step 2 of onboarding. Each one is optional —
  // missing values fall back to the industry template's defaults.
  positions: z.array(z.string().min(1).max(60)).optional(),
  shiftBlocks: z.array(z.object({
    name: z.string().min(1).max(40),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
  geofenceMeters: z.number().int().min(10).max(2000).optional(),
  compliance: z.object({
    mealBreakRequiredAfterHours: z.number().min(0).max(24).optional(),
    predictiveSchedulingDays: z.number().int().min(0).max(60).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tpl = templateByKey(parsed.data.industry);
  if (!tpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  // ---- Resolve effective values: user customizations win over template defaults.
  const positions = parsed.data.positions ?? tpl.positions;
  const shiftBlocks = parsed.data.shiftBlocks ?? tpl.shiftBlocks;
  const geofenceMeters = parsed.data.geofenceMeters ?? tpl.defaultGeofenceMeters;
  const complianceTweaks: Record<string, any> = { ...(tpl.recommendedComplianceTweaks ?? {}) };
  if (parsed.data.compliance) {
    if (parsed.data.compliance.mealBreakRequiredAfterHours !== undefined) {
      complianceTweaks.mealBreakRequiredAfterHours = parsed.data.compliance.mealBreakRequiredAfterHours;
    }
    if (parsed.data.compliance.predictiveSchedulingDays !== undefined) {
      complianceTweaks.predictiveSchedulingDays = parsed.data.compliance.predictiveSchedulingDays;
    }
  }

  // 1. Update org with industry + (user-edited) compliance tweaks
  await prisma.organization.update({ where: { id: u.organizationId }, data: { industry: tpl.key } });
  if (Object.keys(complianceTweaks).length > 0) {
    await prisma.complianceSettings.upsert({
      where: { organizationId: u.organizationId },
      update: complianceTweaks,
      create: { organizationId: u.organizationId, ...complianceTweaks },
    });
  }

  // 2. Create first location if provided (or use existing). Apply the user's
  //    chosen geofence radius — either to the new location or to the existing one.
  let firstLocation = await prisma.location.findFirst({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "asc" },
  });
  if (!firstLocation && parsed.data.firstLocation) {
    // Geocode the address (if provided) so the geofence + map work on day one.
    // Quietly skips if Nominatim is down — we still create the location.
    const geo = parsed.data.firstLocation.address
      ? await geocodeAddress(parsed.data.firstLocation.address)
      : null;
    firstLocation = await prisma.location.create({
      data: {
        organizationId: u.organizationId,
        name: parsed.data.firstLocation.name,
        geofenceRadiusMeters: geofenceMeters,
        ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
      },
    });
  } else if (firstLocation && parsed.data.geofenceMeters !== undefined) {
    firstLocation = await prisma.location.update({
      where: { id: firstLocation.id },
      data: { geofenceRadiusMeters: geofenceMeters },
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
    if (existingShifts === 0 && shiftBlocks.length > 0 && positions.length > 0) {
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const day = addDays(nextWeekStart, dayOffset);
        // Use the first 2-3 shift blocks per day (most setups have 3-4)
        const blocksToUse = shiftBlocks.slice(0, Math.min(3, shiftBlocks.length));
        for (let bi = 0; bi < blocksToUse.length; bi++) {
          const block = blocksToUse[bi];
          const position = positions[bi % positions.length];
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
              // [sample] prefix is the marker the schedule UI uses to render a
              // visual "Sample" badge + dashed border — so brand-new owners can
              // tell these apart from real shifts. Editing the note removes it.
              notes: `[sample] ${block.name} shift — drag a teammate here to assign or delete me when you're ready.`,
            },
          });
          sampleShiftsCreated++;
        }
      }
    }
  }

  // 4b. Default PTO categories — almost every workforce needs at least
  //     vacation + sick. Some industries get a third "personal" bucket.
  //     Only seeded if the org has zero policies yet (idempotent).
  let ptoPoliciesCreated = 0;
  const existingPto = await prisma.ptoPolicy.count({ where: { organizationId: u.organizationId } });
  if (existingPto === 0) {
    const ptoForIndustry = ptoPoliciesForIndustry(tpl.key);
    await prisma.ptoPolicy.createMany({
      data: ptoForIndustry.map(p => ({
        organizationId: u.organizationId,
        category: p.category,
        name: p.name,
        annualHours: p.annualHours,
        accrualMethod: p.accrualMethod,
      })),
    });
    ptoPoliciesCreated = ptoForIndustry.length;
  }

  // 4c. Seasonal time-off blackouts — for industries with predictable peak
  //     periods where employees often can't take time off. The default mode
  //     is "soft" (requires manager override) so it nudges but doesn't block.
  let blackoutsCreated = 0;
  const existingBlackouts = await prisma.timeOffBlackout.count({ where: { organizationId: u.organizationId } });
  if (existingBlackouts === 0) {
    const blackoutsForIndustry = seasonalBlackoutsForIndustry(tpl.key);
    if (blackoutsForIndustry.length > 0) {
      const thisYear = new Date().getFullYear();
      // If we're already past most of the year, seed next year so the dates
      // are still actionable for the customer (no stale "blackout that already
      // ended" entries cluttering the UI on day 1).
      const seedYear = new Date().getMonth() >= 10 ? thisYear + 1 : thisYear;
      await prisma.timeOffBlackout.createMany({
        data: blackoutsForIndustry.map(b => ({
          organizationId: u.organizationId,
          name: b.name,
          startsOn: parseMonthDay(b.startsOn, seedYear),
          endsOn: parseMonthDay(b.endsOn, seedYear),
          mode: b.mode,
        })),
      });
      blackoutsCreated = blackoutsForIndustry.length;
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

  const customizedPositions = parsed.data.positions !== undefined;
  const customizedShiftBlocks = parsed.data.shiftBlocks !== undefined;
  const customizedGeofence = parsed.data.geofenceMeters !== undefined;
  const customizedCompliance = parsed.data.compliance !== undefined;

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: {
      template: tpl.key,
      positions: positions.length,
      shiftBlocks: shiftBlocks.length,
      geofenceMeters,
      compliance: complianceTweaks,
      customized: { positions: customizedPositions, shiftBlocks: customizedShiftBlocks, geofence: customizedGeofence, compliance: customizedCompliance },
      sampleShiftsCreated,
      sampleDayNotesCreated,
      verticalSeeds,
    },
  });

  return NextResponse.json({
    ok: true,
    template: { key: tpl.key, label: tpl.label, positions, shiftBlocks },
    sampleShiftsCreated,
    sampleDayNotesCreated,
    verticalSeeds,
    ptoPoliciesCreated,
    blackoutsCreated,
  });
}

// ─── Industry-specific PTO + blackout defaults ───────────────────────────────
// Hard-coded here (not in industry-templates.ts) because they're a one-shot
// seed and the template file should stay focused on the visible nav/labels.

type PtoSeed = {
  category: "vacation" | "sick" | "personal" | "bereavement" | "unpaid";
  name: string;
  annualHours: number; // 0 = not tracked / unlimited
  accrualMethod: "annual_lump_sum" | "per_pay_period" | "per_hour_worked" | "unlimited";
};

function ptoPoliciesForIndustry(industry: string): PtoSeed[] {
  // Vacation + Sick is the universal baseline. Per-industry tweaks below add
  // a third or fourth category where the vertical commonly needs it.
  const baseline: PtoSeed[] = [
    { category: "vacation", name: "Vacation",  annualHours: 80, accrualMethod: "annual_lump_sum" },
    { category: "sick",     name: "Sick time", annualHours: 40, accrualMethod: "per_hour_worked" },
  ];
  if (industry === "healthcare" || industry === "office") {
    // Healthcare + office tend to formalize bereavement + personal days
    baseline.push({ category: "bereavement", name: "Bereavement", annualHours: 24, accrualMethod: "annual_lump_sum" });
    baseline.push({ category: "personal",    name: "Personal",    annualHours: 16, accrualMethod: "annual_lump_sum" });
  }
  if (industry === "construction" || industry === "field_service") {
    // Trades + field service commonly have unpaid for weather/travel days
    baseline.push({ category: "unpaid", name: "Unpaid time off", annualHours: 0, accrualMethod: "unlimited" });
  }
  return baseline;
}

type BlackoutSeed = {
  name: string;
  startsOn: string; // "MM-DD"
  endsOn: string;   // "MM-DD"
  mode: "hard" | "soft" | "warn";
};

function seasonalBlackoutsForIndustry(industry: string): BlackoutSeed[] {
  // Industries with predictable peak periods get one or two soft blackouts.
  // "soft" = requires manager override, not a hard block. Owner can change.
  switch (industry) {
    case "retail":
    case "grocery":
      return [
        { name: "Black Friday weekend",       startsOn: "11-25", endsOn: "11-30", mode: "soft" },
        { name: "Holiday shopping season",    startsOn: "12-15", endsOn: "12-26", mode: "soft" },
      ];
    case "restaurant":
    case "hospitality":
      return [
        { name: "Valentine's Day rush",       startsOn: "02-13", endsOn: "02-15", mode: "soft" },
        { name: "Mother's Day weekend",       startsOn: "05-09", endsOn: "05-12", mode: "soft" },
        { name: "New Year's Eve service",     startsOn: "12-30", endsOn: "01-02", mode: "soft" },
      ];
    case "fitness":
      return [
        { name: "January resolution rush",    startsOn: "01-02", endsOn: "01-31", mode: "warn" },
      ];
    case "education":
      return [
        { name: "State testing window",       startsOn: "04-15", endsOn: "05-15", mode: "soft" },
        { name: "Graduation week",            startsOn: "06-01", endsOn: "06-15", mode: "soft" },
      ];
    case "healthcare":
      return [
        // Flu season — staffing is critical, time off coordination matters
        { name: "Flu season peak",            startsOn: "12-15", endsOn: "02-15", mode: "warn" },
      ];
    default:
      return [];
  }
}

function parseMonthDay(mmdd: string, year: number): Date {
  const [m, d] = mmdd.split("-").map(Number);
  // Use noon UTC to avoid timezone-edge weirdness when stored as DATE-only
  return new Date(Date.UTC(year, m - 1, d, 12, 0, 0));
}
