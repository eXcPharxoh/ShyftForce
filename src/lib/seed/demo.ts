// Reusable demo seed — Platinum Security org with 4 sites + 15 members + a week of shifts.
// Called by both prisma/seed.ts (CLI) and the /api/admin/seed-demo endpoint.
//
// WARNING: this function is destructive. It deleteMany()'s every table before
// inserting. Only run on an empty DB or when you explicitly want to wipe + reseed.

import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ORG_UUID = "258ae555-e8b8-435a-b844-c1e7a860e756";

export type DemoSeedSummary = {
  orgId: string;
  locations: number;
  members: number;
  shifts: number;
  timesheets: number;
  flagged: number;
  loginHint: string;
};

export async function runDemoSeed(db: PrismaClient): Promise<DemoSeedSummary> {
  // Wipe in dependency order
  // Vertical-specific tables added in 2026 — wipe first since they reference shifts/members.
  await db.subCalloutOffer.deleteMany().catch(() => {});
  await db.subCallout.deleteMany().catch(() => {});
  await db.conferenceBooking.deleteMany().catch(() => {});
  await db.conferenceSlot.deleteMany().catch(() => {});
  await db.subPoolMember.deleteMany().catch(() => {});
  await db.classPeriod.deleteMany().catch(() => {});
  await db.lostFoundItem.deleteMany().catch(() => {});
  await db.hotelRoomAssignment.deleteMany().catch(() => {});
  await db.hotelRoom.deleteMany().catch(() => {});
  await db.safetyBriefingAck.deleteMany().catch(() => {});
  await db.safetyBriefing.deleteMany().catch(() => {});
  await db.equipmentAssignment.deleteMany().catch(() => {});
  await db.equipment.deleteMany().catch(() => {});
  await db.crewMembership.deleteMany().catch(() => {});
  await db.crew.deleteMany().catch(() => {});
  await db.ptSession.deleteMany().catch(() => {});
  await db.classOccurrence.deleteMany().catch(() => {});
  await db.fitnessClass.deleteMany().catch(() => {});
  await db.visitor.deleteMany().catch(() => {});
  await db.meetingRoomBooking.deleteMany().catch(() => {});
  await db.meetingRoom.deleteMany().catch(() => {});
  await db.hotDeskBooking.deleteMany().catch(() => {});
  await db.hotDesk.deleteMany().catch(() => {});
  await db.vmTaskSubmission.deleteMany().catch(() => {});
  await db.vmTask.deleteMany().catch(() => {});
  await db.lossPreventionEvent.deleteMany().catch(() => {});
  await db.shrinkEvent.deleteMany().catch(() => {});
  await db.laneAssignment.deleteMany().catch(() => {});
  await db.posLane.deleteMany().catch(() => {});
  await db.departmentMembership.deleteMany().catch(() => {});
  await db.department.deleteMany().catch(() => {});
  await db.jobCloseout.deleteMany().catch(() => {});
  await db.vehicleAssignment.deleteMany().catch(() => {});
  await db.vehicle.deleteMany().catch(() => {});
  await db.onCallShift.deleteMany().catch(() => {});
  await db.shiftDifferential.deleteMany().catch(() => {});
  await db.patientRatioRule.deleteMany().catch(() => {});

  await db.billboardRead.deleteMany();
  await db.billboardPost.deleteMany();
  await db.message.deleteMany();
  await db.surveyResponse.deleteMany();
  await db.surveyQuestion.deleteMany();
  await db.survey.deleteMany();
  await db.documentRequest.deleteMany();
  await db.document.deleteMany();
  await db.attendanceLog.deleteMany();
  await db.timesheetEntry.deleteMany();
  await db.payPeriod.deleteMany();
  await db.kudos.deleteMany();
  await db.expenseRequest.deleteMany();
  await db.timeOffRequest.deleteMany();
  await db.openShiftRequest.deleteMany();
  await db.shiftTask.deleteMany();
  await db.shift.deleteMany();
  await db.dayNote.deleteMany();
  await db.hRReminder.deleteMany();
  await db.member.deleteMany();
  await db.user.deleteMany();
  await db.location.deleteMany();
  await db.organization.deleteMany();

  const org = await db.organization.create({
    data: { id: ORG_UUID, slug: "platinum-security", name: "Platinum Security", industry: "security" },
  });

  const locationsData = [
    { name: "yoko luna",            weeklyBudget: 12500, projectedRevenue: 14200, latitude: 45.5088, longitude: -73.5878, geofenceRadiusMeters: 75  },
    { name: "Supermarché PA",       weeklyBudget: 9800,  projectedRevenue: 10100, latitude: 45.5230, longitude: -73.5870, geofenceRadiusMeters: 50  },
    { name: "9487-6752 Québec inc", weeklyBudget: 7200,  projectedRevenue: 6900,  latitude: 45.5582, longitude: -73.6580, geofenceRadiusMeters: 120 },
    { name: "PANGEA",               weeklyBudget: 11000, projectedRevenue: 11800, latitude: 45.4972, longitude: -73.5784, geofenceRadiusMeters: 100 },
  ];
  const locations = await Promise.all(
    locationsData.map((d) => db.location.create({ data: { ...d, organizationId: org.id } })),
  );

  const passwordHash = await bcrypt.hash("password", 10);

  // Admin
  const admin = await db.user.create({
    data: {
      email: "admin@platinum.com",
      name: "Omar Maher",
      password: passwordHash,
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=OM&backgroundColor=f97316",
      member: {
        create: {
          organizationId: org.id,
          role: "ADMIN",
          position: "Operations Director",
          locationId: locations[0].id,
          hireDate: new Date("2022-03-15"),
          birthday: new Date("1990-08-12"),
          hourlyRate: 80,
        },
      },
    },
    include: { member: true },
  });

  const managerSpecs = [
    { name: "Sarah Tremblay",   email: "sarah@platinum.com",   loc: 0, position: "Site Manager" },
    { name: "Marc-Antoine Roy", email: "marc@platinum.com",    loc: 1, position: "Site Manager" },
    { name: "Léa Beaulieu",     email: "lea@platinum.com",     loc: 2, position: "Site Manager" },
    { name: "Daniel Park",      email: "daniel@platinum.com",  loc: 3, position: "Site Manager" },
  ];
  const managers: any[] = await Promise.all(managerSpecs.map((m) => db.user.create({
    data: {
      email: m.email,
      name: m.name,
      password: passwordHash,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}&backgroundColor=22c55e`,
      member: {
        create: {
          organizationId: org.id,
          role: "MANAGER",
          position: m.position,
          locationId: locations[m.loc].id,
          hireDate: new Date(2023, 1, 10),
          hourlyRate: 38,
        },
      },
    },
    include: { member: true },
  })));

  const empSpecs = [
    ["Jordan Lee",      "jordan@platinum.com",    0, "Security Officer"],
    ["Aisha Khan",      "aisha@platinum.com",     0, "Security Officer"],
    ["Mateo García",    "mateo@platinum.com",     1, "Security Officer"],
    ["Emily Chen",      "emily@platinum.com",     1, "Lead Officer"],
    ["Noah Williams",   "noah@platinum.com",      2, "Security Officer"],
    ["Priya Patel",     "priya@platinum.com",     2, "Dispatcher"],
    ["Liam O'Brien",    "liam@platinum.com",      3, "Security Officer"],
    ["Zara Ahmed",      "zara@platinum.com",      3, "K9 Handler"],
    ["Tomás Silva",     "tomas@platinum.com",     0, "Patrol"],
    ["Hannah Müller",   "hannah@platinum.com",    1, "Patrol"],
  ] as const;

  const employees: any[] = await Promise.all(empSpecs.map(([name, email, loc, position]) => db.user.create({
    data: {
      email,
      name,
      password: passwordHash,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      member: {
        create: {
          organizationId: org.id,
          role: "EMPLOYEE",
          position,
          locationId: locations[loc].id,
          hireDate: new Date(2024, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27)),
          birthday: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27)),
          hourlyRate: 22 + Math.random() * 6,
        },
      },
    },
    include: { member: true },
  })));

  // ---- Shifts (this week)
  const today = new Date(); today.setHours(0,0,0,0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
  const shiftCreates = [] as Promise<any>[];
  for (let d = 0; d < 7; d++) {
    for (const e of employees) {
      if (Math.random() < 0.7) {
        const start = new Date(weekStart); start.setDate(weekStart.getDate() + d); start.setHours(8 + Math.floor(Math.random()*4), 0, 0, 0);
        const end = new Date(start); end.setHours(start.getHours() + 8);
        shiftCreates.push(db.shift.create({
          data: {
            locationId: e.member!.locationId!,
            memberId: e.member!.id,
            startsAt: start,
            endsAt: end,
            position: e.member!.position,
            status: d < 4 ? "published" : "draft",
            tasks: { create: [
              { task: "Patrol perimeter (every 2h)" },
              { task: "Check entry logs" },
              { task: "Submit incident report" },
            ]},
          },
        }));
      }
    }
    if (Math.random() < 0.6) {
      const start = new Date(weekStart); start.setDate(weekStart.getDate() + d); start.setHours(22, 0, 0, 0);
      const end = new Date(start); end.setHours(start.getHours() + 8);
      const loc = locations[Math.floor(Math.random()*locations.length)];
      shiftCreates.push(db.shift.create({
        data: {
          locationId: loc.id,
          startsAt: start,
          endsAt: end,
          position: "Overnight Patrol",
          status: "published",
          isOpen: true,
        },
      }));
    }
  }
  await Promise.all(shiftCreates);

  // ---- Time off + Expenses (bulk createMany)
  await db.timeOffRequest.createMany({
    data: Array.from({ length: 6 }, (_, i) => {
      const m = employees[i % employees.length].member!;
      const start = new Date(today); start.setDate(today.getDate() + 7 + i*2);
      const end = new Date(start); end.setDate(start.getDate() + 1 + Math.floor(Math.random()*3));
      return {
        memberId: m.id, startsOn: start, endsOn: end,
        category: ["vacation","sick","personal"][i % 3],
        reason: ["Family trip","Doctor's appointment","Personal day"][i % 3],
        status: i < 2 ? "pending" : i < 4 ? "approved" : "rejected",
      };
    }),
  });

  await db.expenseRequest.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      memberId: employees[i % employees.length].member!.id,
      amount: 25 + Math.random() * 200, currency: "USD",
      category: ["mileage","equipment","training","meal"][i % 4],
      notes: "Submitted via mobile app",
      status: i < 2 ? "pending" : "approved",
    })),
  });

  // ---- Pay period + timesheets
  const payStart = new Date(today); payStart.setDate(today.getDate() - 14);
  const payEnd = new Date(today); payEnd.setDate(today.getDate() - 1);
  const period = await db.payPeriod.create({
    data: { organizationId: org.id, startsOn: payStart, endsOn: payEnd, status: "open" },
  });
  // Build all timesheet data first, then bulk-create via createMany (10x faster)
  const tsData: any[] = [];
  let flagged = 0;
  for (const e of employees) {
    for (let d = 0; d < 14; d++) {
      if (Math.random() < 0.7) {
        const date = new Date(payStart); date.setDate(payStart.getDate() + d);
        const isFlagged = Math.random() < 0.12;
        if (isFlagged) flagged++;
        tsData.push({
          payPeriodId: period.id, memberId: e.member!.id, date,
          hours: 6 + Math.random() * 4,
          approved: !isFlagged && Math.random() < 0.55,
          flagged: isFlagged,
          notes: isFlagged ? "Missed clock-out" : null,
        });
      }
    }
  }
  await db.timesheetEntry.createMany({ data: tsData });
  const entries = tsData.length;

  // ---- Live attendance + Kudos + Day notes + HR reminders (bulk + parallel)
  const now = new Date();
  const kudosTexts = [
    "Crushed the night shift solo when the system went down. Legend.",
    "Stayed late to train the new hire — above and beyond!",
    "Caught the loitering issue before it escalated. Sharp eye.",
    "Always the first to volunteer for coverage. We see you.",
    "De-escalated a tough situation with grace today.",
  ];
  const reminderTitles = [
    "Submit Q3 performance reviews",
    "Renew first-aid certifications (3 employees)",
    "Audit overtime trends for last pay period",
    "Schedule onboarding check-ins for new hires",
    "Review proposed schedule changes for next week",
  ];
  const dayNoteBodies = ["VIP visit @ 14:00 — extra coverage at lobby","Loading dock closed all day","Fire drill 10:30","Inventory count overnight","Construction crew on-site"];

  await Promise.all([
    db.attendanceLog.createMany({
      data: [0, 1].map((i) => {
        const at = new Date(now); at.setHours(now.getHours() - 1 - i);
        return { memberId: employees[i].member!.id, type: "clock_in", at };
      }),
    }),
    db.kudos.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        fromId: managers[i % managers.length].member!.id,
        toId: employees[i % employees.length].member!.id,
        message: kudosTexts[i], emoji: ["🙌","⭐","🔥","💪","🎯"][i],
      })),
    }),
    db.dayNote.createMany({
      data: Array.from({ length: 5 }, (_, d) => {
        const date = new Date(today); date.setDate(today.getDate() + d);
        return {
          organizationId: org.id, locationId: locations[d % locations.length].id, date,
          body: dayNoteBodies[d], authorId: managers[d % managers.length].member!.id,
        };
      }),
    }),
    db.hRReminder.createMany({
      data: reminderTitles.map((title, i) => {
        const due = new Date(today); due.setDate(today.getDate() + i + 1);
        return { organizationId: org.id, title, dueOn: due };
      }),
    }),
  ]);

  // ---- Survey
  const survey = await db.survey.create({
    data: {
      organizationId: org.id,
      title: "Interest in training on Anger management and danger dissolution",
      description: "Help us decide whether to roll out this training program.",
      questions: { create: [
        { question: "Are you interested in attending this training?", type: "yes_no", order: 1 },
        { question: "How relevant is this to your role? (1-5)", type: "scale", order: 2 },
        { question: "Anything you'd want covered specifically?", type: "text", order: 3 },
      ]},
    },
    include: { questions: true },
  });
  // ---- Survey responses + Docs + Doc requests + Messages + Billboard (bulk + parallel)
  const respondents = [...employees, ...managers].slice(0, 16);
  const billboardPosts = [
    { title: "New uniforms arriving Monday", body: "Pickup at HQ between 8-5. Please bring your old uniform for exchange." },
    { title: "Holiday schedule released",  body: "See attached for the full December coverage plan. Trade requests due by the 15th." },
    { title: "Q3 performance bonuses",     body: "Bonuses processed with this pay period. Top 3 sites earn an extra 4%." },
    { title: "Safety training — sign up",  body: "Spots opening for our advanced de-escalation workshop. RSVP by Friday." },
    { title: "Welcome new hires",          body: "Please welcome Liam, Zara, and Tomás to the team this month." },
    { title: "App update rolling out",     body: "shyftforce v2.1 ships next week — push notifications enabled by default." },
    { title: "Referral bonus increased",   body: "Refer a hire and earn $500 (was $300). Promo runs through year-end." },
  ];

  await Promise.all([
    db.surveyResponse.createMany({
      data: respondents.map((r) => ({
        surveyId: survey.id, memberId: r.member!.id,
        answers: JSON.stringify({ q1: Math.random()<0.7 ? "yes" : "no", q2: 1 + Math.floor(Math.random()*5), q3: "" }),
      })),
    }),
    db.document.createMany({
      data: Array.from({ length: 4 }, (_, i) => ({
        organizationId: org.id, memberId: employees[i].member!.id,
        name: ["Contract.pdf","ID Verification.pdf","Training Certificate.pdf","Direct Deposit.pdf"][i],
        url: "#", category: ["contract","identity","training","payroll"][i],
      })),
    }),
    db.documentRequest.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        memberId: employees[i + 4].member!.id,
        documentName: ["Updated direct-deposit form","Renewed firearm permit","2024 W-9"][i],
        status: "pending",
      })),
    }),
    db.message.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        fromId: managers[0].member!.id, toId: employees[i].member!.id,
        body: ["Hey, can you cover Saturday's shift?","Great work last night.","Don't forget the incident form."][i],
      })),
    }),
    db.billboardPost.createMany({
      data: billboardPosts.map((p) => ({
        organizationId: org.id, authorId: admin.member!.id,
        title: p.title, body: p.body, category: "announcement",
      })),
    }),
  ]);

  // ---------- Vertical-feature samples ----------
  // The demo org is "security" by industry, but to make the cross-vertical
  // features non-empty when a demo viewer clicks around, we sprinkle a small
  // amount of representative data into each new table. This is what someone
  // exploring /rooms, /classes, /shrink, /vm-tasks, etc. will see.
  const firstLoc = locations[0];
  const firstMgr = managers[0].member!;
  const firstEmp = employees[0].member!;
  const secondEmp = employees[1]?.member ?? firstEmp;
  await Promise.all([
    // Departments (for grocery/retail demo)
    db.department.createMany({
      data: [
        { organizationId: org.id, name: "Patrol", color: "#6366f1" },
        { organizationId: org.id, name: "Dispatch", color: "#10b981" },
        { organizationId: org.id, name: "Console", color: "#f59e0b" },
      ],
    }),
    // Shrink events
    db.shrinkEvent.createMany({
      data: [
        { organizationId: org.id, reason: "theft",    productName: "Tablet (display)", quantity: 1, unitValueCents: 19999, totalValueCents: 19999, reportedById: firstEmp.id },
        { organizationId: org.id, reason: "damage",   productName: "Radio handset",    quantity: 2, unitValueCents: 14500, totalValueCents: 29000, reportedById: firstEmp.id },
        { organizationId: org.id, reason: "spoilage", productName: "Sample produce",   quantity: 5, unitValueCents: 350,   totalValueCents: 1750,  reportedById: secondEmp.id },
      ],
    }),
    // Loss prevention
    db.lossPreventionEvent.createMany({
      data: [
        { organizationId: org.id, type: "shoplift",       description: "Suspect concealed merchandise in jacket; recovered at exit.", valueCents: 4500, reportedById: firstEmp.id },
        { organizationId: org.id, type: "register_error", description: "Cashier short $20 at end of shift.", valueCents: 2000, reportedById: firstMgr.id },
      ],
    }),
    // VM tasks
    db.vmTask.createMany({
      data: [
        { organizationId: org.id, name: "Window display refresh",  assignedToMemberId: firstEmp.id,  requirePhoto: true, status: "open", dueDate: new Date(Date.now() + 2 * 86400_000) },
        { organizationId: org.id, name: "Endcap set — summer",     assignedToMemberId: secondEmp.id, requirePhoto: true, status: "done" },
        { organizationId: org.id, name: "Mannequin re-style",      assignedToMemberId: firstEmp.id,  requirePhoto: false, status: "open" },
      ],
    }),
    // POS lanes
    db.posLane.createMany({
      data: [
        { organizationId: org.id, locationId: firstLoc.id, number: 1, name: "Main",    type: "standard" },
        { organizationId: org.id, locationId: firstLoc.id, number: 2, name: "Express", type: "express" },
        { organizationId: org.id, locationId: firstLoc.id, number: 3, name: "Self-checkout 1", type: "self_checkout" },
      ],
    }),
    // Hot desks
    db.hotDesk.createMany({
      data: [
        { organizationId: org.id, name: "Desk 1",  zone: "Open floor", hasMonitor: true },
        { organizationId: org.id, name: "Desk 2",  zone: "Open floor", hasMonitor: true, hasStanding: true },
        { organizationId: org.id, name: "Desk 3",  zone: "Engineering", hasMonitor: true },
      ],
    }),
    // Meeting rooms
    db.meetingRoom.createMany({
      data: [
        { organizationId: org.id, name: "Olympus", capacity: 8,  hasVideo: true, hasWhiteboard: true },
        { organizationId: org.id, name: "Phone Booth A", capacity: 1, hasVideo: false },
      ],
    }),
    // Visitor (on-site now)
    db.visitor.create({
      data: {
        organizationId: org.id, name: "Maria Johnson", company: "Acme Corp",
        hostMemberId: firstMgr.id, badgeNumber: "V-001", purpose: "Quarterly business review",
      },
    }),
    // Fitness classes
    (async () => {
      const c1 = await db.fitnessClass.create({ data: { organizationId: org.id, name: "Bootcamp", durationMins: 45, capacity: 16, color: "#ef4444" } });
      const c2 = await db.fitnessClass.create({ data: { organizationId: org.id, name: "Yoga",     durationMins: 60, capacity: 20, color: "#10b981" } });
      await db.classOccurrence.createMany({
        data: [
          { fitnessClassId: c1.id, instructorMemberId: firstEmp.id,  startsAt: new Date(Date.now() + 86400_000),       endsAt: new Date(Date.now() + 86400_000 + 45*60_000) },
          { fitnessClassId: c2.id, instructorMemberId: secondEmp.id, startsAt: new Date(Date.now() + 2*86400_000),     endsAt: new Date(Date.now() + 2*86400_000 + 60*60_000) },
        ],
      });
    })(),
    // PT sessions
    db.ptSession.create({
      data: {
        organizationId: org.id, trainerMemberId: firstEmp.id,
        clientName: "Alex Chen", clientPhone: "+15555550101",
        startsAt: new Date(Date.now() + 3 * 86400_000),
        endsAt:   new Date(Date.now() + 3 * 86400_000 + 3600_000),
        rateCents: 8000, trainerSplitPct: 70, status: "booked",
      },
    }),
    // Construction crew + equipment + safety briefing
    (async () => {
      const crew = await db.crew.create({ data: { organizationId: org.id, name: "Alpha Crew", color: "#f59e0b", foremanId: firstMgr.id } });
      await db.crewMembership.createMany({
        data: [
          { crewId: crew.id, memberId: firstEmp.id,  role: "crew", isPrimary: true },
          { crewId: crew.id, memberId: secondEmp.id, role: "lead", isPrimary: true },
        ],
      });
      await db.equipment.createMany({
        data: [
          { organizationId: org.id, name: "Generator 7500W", category: "machine",     status: "available" },
          { organizationId: org.id, name: "Scaffolding kit", category: "scaffolding", status: "in_use" },
          { organizationId: org.id, name: "Hard hats (×12)", category: "safety_gear", status: "available" },
        ],
      });
      const briefing = await db.safetyBriefing.create({
        data: { organizationId: org.id, postedById: firstMgr.id, topic: "Trench safety", details: "Working in 6'+ trenches today. Shoring required on all trenches deeper than 5'." },
      });
      await db.safetyBriefingAck.create({ data: { briefingId: briefing.id, memberId: firstEmp.id } });
    })(),
    // Hotel rooms
    (async () => {
      const rooms = await Promise.all([
        db.hotelRoom.create({ data: { organizationId: org.id, number: "101", floor: 1, type: "standard", status: "clean" } }),
        db.hotelRoom.create({ data: { organizationId: org.id, number: "102", floor: 1, type: "standard", status: "dirty" } }),
        db.hotelRoom.create({ data: { organizationId: org.id, number: "201", floor: 2, type: "suite",    status: "cleaning" } }),
        db.hotelRoom.create({ data: { organizationId: org.id, number: "202", floor: 2, type: "standard", status: "clean" } }),
      ]);
      await db.hotelRoomAssignment.create({
        data: { hotelRoomId: rooms[2].id, memberId: firstEmp.id, startedAt: new Date(Date.now() - 25*60_000) },
      });
    })(),
    // Lost & found
    db.lostFoundItem.createMany({
      data: [
        { organizationId: org.id, description: "Silver iPhone with rose-gold case", foundLocation: "Pool deck",  loggedById: firstEmp.id,  status: "unclaimed" },
        { organizationId: org.id, description: "Black leather wallet (no ID inside)", foundLocation: "Room 312", loggedById: secondEmp.id, status: "unclaimed" },
        { organizationId: org.id, description: "Kids' jacket — red, size 6",        foundLocation: "Lobby couch", loggedById: firstEmp.id,  status: "claimed", claimedBy: "Sarah Park", claimedAt: new Date(Date.now() - 2*86400_000) },
      ],
    }),
    // Education samples
    (async () => {
      // Bell schedule
      await db.classPeriod.createMany({
        data: [
          { organizationId: org.id, number: 1, name: "1st",   startTime: "08:00", endTime: "08:50", daysOfWeek: "[1,2,3,4,5]" },
          { organizationId: org.id, number: 2, name: "2nd",   startTime: "08:55", endTime: "09:45", daysOfWeek: "[1,2,3,4,5]" },
          { organizationId: org.id, number: 3, name: "3rd",   startTime: "09:50", endTime: "10:40", daysOfWeek: "[1,2,3,4,5]" },
          { organizationId: org.id, number: 4, name: "Lunch", startTime: "11:35", endTime: "12:15", daysOfWeek: "[1,2,3,4,5]" },
        ],
      });
      // Sub pool (2 members)
      await db.subPoolMember.createMany({
        data: [
          { organizationId: org.id, memberId: firstEmp.id,  subjects: JSON.stringify(["Math", "Science"]), grades: JSON.stringify(["6","7","8"]), hourlyRateCents: 3500, preferredContactHour: 6, latestContactHour: 20 },
          { organizationId: org.id, memberId: secondEmp.id, subjects: JSON.stringify(["English"]),         grades: JSON.stringify(["9","10","11","12"]), hourlyRateCents: 3500, preferredContactHour: 7, latestContactHour: 19 },
        ],
      });
      // Conference slots
      const slotStart = new Date(); slotStart.setDate(slotStart.getDate() + 5); slotStart.setHours(15, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        const s = new Date(slotStart.getTime() + i * 15 * 60_000);
        const e = new Date(s.getTime() + 15 * 60_000);
        await db.conferenceSlot.create({
          data: { organizationId: org.id, teacherMemberId: firstMgr.id, startsAt: s, endsAt: e },
        });
      }
    })(),
    // Patient ratio rule (healthcare)
    db.patientRatioRule.create({
      data: { organizationId: org.id, unit: "med_surg", role: "RN", patientCount: 5, staffCount: 1 },
    }),
    // Shift differential
    db.shiftDifferential.create({
      data: { organizationId: org.id, name: "Night shift (+15%)", kind: "night", startHour: 22, endHour: 6, multiplier: 1.15 },
    }),
    // On-call shift
    db.onCallShift.create({
      data: {
        organizationId: org.id, memberId: firstEmp.id,
        startsAt: new Date(Date.now() + 7 * 86400_000),
        endsAt:   new Date(Date.now() + 8 * 86400_000),
        stipendCents: 5000, calledInPremiumMultiplier: 1.5,
      },
    }),
    // Vehicle
    db.vehicle.create({
      data: { organizationId: org.id, name: "Van 1", licensePlate: "ABC-123", make: "Ford", model: "Transit", year: 2024, status: "active" },
    }),
  ]);

  return {
    orgId: org.id,
    locations: locations.length,
    members: 1 + managers.length + employees.length,
    shifts: shiftCreates.length,
    timesheets: entries,
    flagged,
    loginHint: "admin@platinum.com / password  ·  sarah@platinum.com (manager)  ·  jordan@platinum.com (employee)",
  };
}
