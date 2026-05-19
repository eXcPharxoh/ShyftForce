// CSV bulk import for substitute teacher pool.
// Expected headers: email,subjects,grades,hourlyRate
// Subjects + grades are comma-or-pipe separated inside the cell, e.g. "Math|Science"
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv/parse";

const Schema = z.object({ csv: z.string().min(5).max(500_000) });

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(/[|;]/).map(x => x.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Missing csv" }, { status: 400 });

  const parseResult = parseCsv(parsed.data.csv);
  if (!parseResult) return NextResponse.json({ error: "Could not parse CSV" }, { status: 400 });
  if (!parseResult.headers.includes("email")) {
    return NextResponse.json({ error: "CSV must include 'email' column to match members" }, { status: 400 });
  }

  const results: { email: string; status: "created" | "updated" | "skipped" | "error"; error?: string }[] = [];
  for (const row of parseResult.rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email) { results.push({ email: "(blank)", status: "error", error: "missing email" }); continue; }
    try {
      const member = await prisma.member.findFirst({
        where: { organizationId: u.organizationId, user: { email } },
        select: { id: true },
      });
      if (!member) { results.push({ email, status: "skipped", error: "no member with that email" }); continue; }

      const subjects = splitList(row.subjects);
      const grades   = splitList(row.grades);
      const rate     = row.hourlyRate ? Math.round(parseFloat(row.hourlyRate) * 100) : 0;

      const existing = await prisma.subPoolMember.findUnique({ where: { memberId: member.id } });
      if (existing) {
        await prisma.subPoolMember.update({
          where: { memberId: member.id },
          data: {
            subjects: subjects.length ? JSON.stringify(subjects) : null,
            grades:   grades.length   ? JSON.stringify(grades)   : null,
            hourlyRateCents: rate,
          },
        });
        results.push({ email, status: "updated" });
      } else {
        await prisma.subPoolMember.create({
          data: {
            organizationId: u.organizationId,
            memberId: member.id,
            subjects: subjects.length ? JSON.stringify(subjects) : null,
            grades:   grades.length   ? JSON.stringify(grades)   : null,
            hourlyRateCents: rate,
          },
        });
        results.push({ email, status: "created" });
      }
    } catch (e: any) {
      results.push({ email, status: "error", error: e.message?.slice(0, 100) ?? "failed" });
    }
  }
  const summary = {
    created: results.filter(r => r.status === "created").length,
    updated: results.filter(r => r.status === "updated").length,
    skipped: results.filter(r => r.status === "skipped").length,
    errors:  results.filter(r => r.status === "error").length,
  };
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "SubPoolMember", entityId: "bulk-import",
    metadata: summary,
  });
  return NextResponse.json({ ok: true, summary, results });
}
