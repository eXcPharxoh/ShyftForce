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
  const managers: any[] = [];
  for (const m of managerSpecs) {
    managers.push(await db.user.create({
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
    }));
  }

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

  const employees: any[] = [];
  for (const [name, email, loc, position] of empSpecs) {
    employees.push(await db.user.create({
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
    }));
  }

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

  // ---- Time off
  for (let i = 0; i < 6; i++) {
    const m = employees[i % employees.length].member!;
    const start = new Date(today); start.setDate(today.getDate() + 7 + i*2);
    const end = new Date(start); end.setDate(start.getDate() + 1 + Math.floor(Math.random()*3));
    await db.timeOffRequest.create({
      data: { memberId: m.id, startsOn: start, endsOn: end,
        category: ["vacation","sick","personal"][i % 3],
        reason: ["Family trip","Doctor's appointment","Personal day"][i % 3],
        status: i < 2 ? "pending" : i < 4 ? "approved" : "rejected" },
    });
  }

  // ---- Expenses
  for (let i = 0; i < 5; i++) {
    const m = employees[i % employees.length].member!;
    await db.expenseRequest.create({
      data: { memberId: m.id, amount: 25 + Math.random() * 200, currency: "USD",
        category: ["mileage","equipment","training","meal"][i % 4],
        notes: "Submitted via mobile app",
        status: i < 2 ? "pending" : "approved" },
    });
  }

  // ---- Pay period + timesheets
  const payStart = new Date(today); payStart.setDate(today.getDate() - 14);
  const payEnd = new Date(today); payEnd.setDate(today.getDate() - 1);
  const period = await db.payPeriod.create({
    data: { organizationId: org.id, startsOn: payStart, endsOn: payEnd, status: "open" },
  });
  let entries = 0, flagged = 0;
  for (const e of employees) {
    for (let d = 0; d < 14; d++) {
      if (Math.random() < 0.7) {
        const date = new Date(payStart); date.setDate(payStart.getDate() + d);
        const isFlagged = Math.random() < 0.12;
        await db.timesheetEntry.create({
          data: { payPeriodId: period.id, memberId: e.member!.id, date,
            hours: 6 + Math.random() * 4,
            approved: !isFlagged && Math.random() < 0.55,
            flagged: isFlagged,
            notes: isFlagged ? "Missed clock-out" : null },
        });
        entries++; if (isFlagged) flagged++;
      }
    }
  }

  // ---- Live attendance
  const now = new Date();
  for (let i = 0; i < 2; i++) {
    const m = employees[i].member!;
    const at = new Date(now); at.setHours(now.getHours() - 1 - i);
    await db.attendanceLog.create({ data: { memberId: m.id, type: "clock_in", at } });
  }

  // ---- Kudos
  const kudosTexts = [
    "Crushed the night shift solo when the system went down. Legend.",
    "Stayed late to train the new hire — above and beyond!",
    "Caught the loitering issue before it escalated. Sharp eye.",
    "Always the first to volunteer for coverage. We see you.",
    "De-escalated a tough situation with grace today.",
  ];
  for (let i = 0; i < 5; i++) {
    await db.kudos.create({
      data: { fromId: managers[i % managers.length].member!.id,
        toId: employees[i % employees.length].member!.id,
        message: kudosTexts[i], emoji: ["🙌","⭐","🔥","💪","🎯"][i] },
    });
  }

  // ---- Day notes
  for (let d = 0; d < 5; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    await db.dayNote.create({
      data: { organizationId: org.id, locationId: locations[d % locations.length].id, date,
        body: ["VIP visit @ 14:00 — extra coverage at lobby","Loading dock closed all day","Fire drill 10:30","Inventory count overnight","Construction crew on-site"][d],
        authorId: managers[d % managers.length].member!.id },
    });
  }

  // ---- HR Reminders
  const reminders = [
    "Submit Q3 performance reviews",
    "Renew first-aid certifications (3 employees)",
    "Audit overtime trends for last pay period",
    "Schedule onboarding check-ins for new hires",
    "Review proposed schedule changes for next week",
  ];
  for (let i = 0; i < reminders.length; i++) {
    const due = new Date(today); due.setDate(today.getDate() + i + 1);
    await db.hRReminder.create({ data: { organizationId: org.id, title: reminders[i], dueOn: due } });
  }

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
  const respondents = [...employees, ...managers].slice(0, 16);
  for (const r of respondents) {
    await db.surveyResponse.create({
      data: { surveyId: survey.id, memberId: r.member!.id,
        answers: JSON.stringify({ q1: Math.random()<0.7 ? "yes" : "no", q2: 1 + Math.floor(Math.random()*5), q3: "" }) },
    });
  }

  // ---- Documents + requests
  for (let i = 0; i < 4; i++) {
    await db.document.create({
      data: { organizationId: org.id, memberId: employees[i].member!.id,
        name: ["Contract.pdf","ID Verification.pdf","Training Certificate.pdf","Direct Deposit.pdf"][i],
        url: "#", category: ["contract","identity","training","payroll"][i] },
    });
  }
  for (let i = 0; i < 3; i++) {
    await db.documentRequest.create({
      data: { memberId: employees[i + 4].member!.id,
        documentName: ["Updated direct-deposit form","Renewed firearm permit","2024 W-9"][i],
        status: "pending" },
    });
  }

  // ---- Messenger
  for (let i = 0; i < 3; i++) {
    await db.message.create({
      data: { fromId: managers[0].member!.id, toId: employees[i].member!.id,
        body: ["Hey, can you cover Saturday's shift?","Great work last night.","Don't forget the incident form."][i] },
    });
  }

  // ---- Billboard
  const billboardPosts = [
    { title: "New uniforms arriving Monday", body: "Pickup at HQ between 8-5. Please bring your old uniform for exchange." },
    { title: "Holiday schedule released",  body: "See attached for the full December coverage plan. Trade requests due by the 15th." },
    { title: "Q3 performance bonuses",     body: "Bonuses processed with this pay period. Top 3 sites earn an extra 4%." },
    { title: "Safety training — sign up",  body: "Spots opening for our advanced de-escalation workshop. RSVP by Friday." },
    { title: "Welcome new hires",          body: "Please welcome Liam, Zara, and Tomás to the team this month." },
    { title: "App update rolling out",     body: "shyftforce v2.1 ships next week — push notifications enabled by default." },
    { title: "Referral bonus increased",   body: "Refer a hire and earn $500 (was $300). Promo runs through year-end." },
  ];
  for (const p of billboardPosts) {
    await db.billboardPost.create({
      data: { organizationId: org.id, authorId: admin.member!.id,
        title: p.title, body: p.body, category: "announcement" },
    });
  }

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
