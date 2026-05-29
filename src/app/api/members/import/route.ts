import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { PLANS, effectivePlanKey } from "@/lib/stripe";
import { syncSeatsForOrg } from "@/lib/billing/sync-seats";

const RowSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  name:     z.string().min(1).max(80),
  role:     z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  position: z.string().optional().nullable(),
  location: z.string().optional().nullable(),  // location name; matched fuzzy
  phone:    z.string().optional().nullable(),
  hourlyRate: z.union([z.number(), z.string()]).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  emergencyContactName:  z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  notes:    z.string().optional().nullable(),
});

const Body = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1).max(500),
  invite: z.boolean().default(true),
});

function num(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : null;
}

function date(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const [locations, org, existingActive] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId } }),
    prisma.organization.findUnique({ where: { id: u.organizationId }, select: { plan: true, trialEndsAt: true } }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
  ]);
  const locByName = new Map(locations.map(l => [l.name.toLowerCase(), l]));

  // Free plan caps active members. We'll count toward the cap as we import.
  // Trial orgs effectively run as Business (unlimited) via effectivePlanKey.
  const planKey = effectivePlanKey(org);
  const planDef = PLANS[planKey];
  const hardCap = planDef.maxMembersHard;
  let runningActive = existingActive;

  const results: Array<{ row: number; email?: string; status: "created" | "invited" | "exists" | "error"; message?: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const raw = parsed.data.rows[i];
    // Normalize header variants
    const norm: any = {
      email: raw.email ?? raw.Email ?? raw.EMAIL,
      name:  raw.name  ?? raw.Name  ?? raw["Full Name"] ?? raw.full_name,
      role:  (raw.role ?? raw.Role ?? "EMPLOYEE").toString().toUpperCase(),
      position: raw.position ?? raw.Position ?? raw.title ?? raw.Title,
      location: raw.location ?? raw.Location ?? raw.site ?? raw.Site,
      phone: raw.phone ?? raw.Phone ?? raw.mobile,
      hourlyRate: raw.hourlyRate ?? raw.hourly_rate ?? raw.rate ?? raw.Rate,
      hireDate: raw.hireDate ?? raw.hire_date ?? raw["Hire Date"],
      birthday: raw.birthday ?? raw.dob ?? raw["Date of Birth"],
      emergencyContactName:  raw.emergencyContactName  ?? raw.emergency_contact_name  ?? raw["Emergency Contact"],
      emergencyContactPhone: raw.emergencyContactPhone ?? raw.emergency_contact_phone ?? raw["Emergency Phone"],
      notes: raw.notes ?? raw.Notes,
    };
    if (!norm.email) { results.push({ row: i + 2, status: "error", message: "Missing email" }); continue; }
    if (!["ADMIN","MANAGER","EMPLOYEE"].includes(norm.role)) norm.role = "EMPLOYEE";

    const v = RowSchema.safeParse(norm);
    if (!v.success) {
      results.push({ row: i + 2, email: norm.email, status: "error", message: v.error.issues[0]?.message ?? "Validation failed" });
      continue;
    }
    const r = v.data;

    // Resolve location
    const loc = r.location ? locByName.get(r.location.toLowerCase()) : null;

    try {
      const existing = await prisma.user.findUnique({ where: { email: r.email }, include: { member: true } });
      if (existing?.member) {
        results.push({ row: i + 2, email: r.email, status: "exists", message: "Already a member" });
        continue;
      }

      // Hard-cap enforcement (Free plan only — Pro/Business are uncapped + overage-billed)
      if (hardCap < 9999 && runningActive >= hardCap) {
        results.push({
          row: i + 2, email: r.email, status: "error",
          message: `Plan cap hit (${hardCap} active members on ${planDef.label}). Upgrade to add more.`,
        });
        continue;
      }

      if (parsed.data.invite) {
        // Send invitation
        const token = randomBytes(32).toString("hex");
        await prisma.invitation.create({
          data: {
            organizationId: u.organizationId, email: r.email,
            role: r.role, position: r.position ?? undefined,
            locationId: loc?.id, invitedById: u.id, token,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          },
        });
        await sendEmail({
          to: r.email,
          subject: `You've been invited to ${u.organizationName} on shyftforce`,
          html: Email.invite({ orgName: u.organizationName, inviterName: u.name, token }),
        });
        results.push({ row: i + 2, email: r.email, status: "invited" });
      } else {
        // Create immediately with random password (employee can use forgot-password)
        const password = randomBytes(12).toString("base64url");
        const hash = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            email: r.email, name: r.name, password: hash,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`,
            member: {
              create: {
                organizationId: u.organizationId,
                role: r.role,
                position: r.position ?? null,
                locationId: loc?.id,
                phone: r.phone ?? null,
                hourlyRate: num(r.hourlyRate),
                hourlyRateCents: num(r.hourlyRate) == null ? null : Math.round(num(r.hourlyRate)! * 100),
                hireDate: date(r.hireDate) ?? new Date(),
                birthday: date(r.birthday),
                emergencyContactName:  r.emergencyContactName  ?? null,
                emergencyContactPhone: r.emergencyContactPhone ?? null,
                notes: r.notes ?? null,
              },
            },
          },
        });
        runningActive++; // direct-create immediately occupies a seat
        results.push({ row: i + 2, email: r.email, status: "created" });
      }
    } catch (e: any) {
      results.push({ row: i + 2, email: r.email, status: "error", message: e.message ?? "create failed" });
    }
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "member.invite", entityType: "Import",
    metadata: { total: parsed.data.rows.length, results: results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as any) },
  });
  // Push the new seat count to Stripe (fire-and-forget).
  syncSeatsForOrg(u.organizationId).catch(() => {});

  return NextResponse.json({
    summary: results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    results,
  });
}
