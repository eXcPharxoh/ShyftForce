// Bulk shift import. Matches the pattern of /api/members/import: accept an
// array of CSV rows, validate, look up location + member by name/email, create
// shifts in a single transaction so partial imports don't leave the schedule
// in a weird state.
//
// CSV columns (case-insensitive headers, all optional except date/startTime/endTime/location):
//   date         YYYY-MM-DD
//   startTime    HH:MM (24h)
//   endTime      HH:MM (24h)
//   location     Location name (substring match if exact not found)
//   position     Free-text label
//   memberEmail  If present, assigns the shift to that member; otherwise open
//   notes        Free-text
//   publish      "true" | "false" — defaults to false (draft)

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/session";
import { audit } from "@/lib/audit";

const RowSchema = z.object({
  date:        z.string().min(8),
  startTime:   z.string().regex(/^\d{1,2}:\d{2}$/),
  endTime:     z.string().regex(/^\d{1,2}:\d{2}$/),
  location:    z.string().min(1),
  position:    z.string().optional(),
  memberEmail: z.string().email().optional().or(z.literal("")),
  notes:       z.string().optional(),
  publish:     z.union([z.string(), z.boolean()]).optional(),
});

const PayloadSchema = z.object({
  rows: z.array(z.record(z.any())).min(1).max(500),
});

function pick(row: Record<string, any>, key: string): string | undefined {
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === key.toLowerCase()) {
      const v = row[k];
      return typeof v === "string" ? v.trim() : undefined;
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  const check = await checkPermission("schedule.write");
  if (!check) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ("denied" in check) return NextResponse.json({ error: "You don't have schedule permission." }, { status: 403 });
  const u = check.user;

  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Pre-load all locations + members for lookups so we don't hit the DB per row
  const [locations, members] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId }, select: { id: true, name: true } }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      select: { id: true, user: { select: { email: true } } },
    }),
  ]);

  const results: { row: number; status: "ok" | "skipped" | "error"; message?: string }[] = [];
  const toCreate: Array<{
    locationId: string;
    startsAt: Date;
    endsAt: Date;
    position: string | null;
    memberId: string | null;
    isOpen: boolean;
    notes: string | null;
    status: "draft" | "published";
  }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const raw = parsed.data.rows[i];
    const normalized = {
      date:        pick(raw, "date") ?? "",
      startTime:   pick(raw, "startTime") ?? pick(raw, "start") ?? "",
      endTime:     pick(raw, "endTime")   ?? pick(raw, "end")   ?? "",
      location:    pick(raw, "location") ?? "",
      position:    pick(raw, "position"),
      memberEmail: (pick(raw, "memberEmail") ?? pick(raw, "email"))?.toLowerCase(),
      notes:       pick(raw, "notes"),
      publish:     pick(raw, "publish"),
    };
    const rowParse = RowSchema.safeParse(normalized);
    if (!rowParse.success) {
      results.push({ row: i + 1, status: "error", message: rowParse.error.errors[0]?.message ?? "Invalid row" });
      continue;
    }
    const row = rowParse.data;

    // Location lookup (exact first, then case-insensitive substring)
    const loc = locations.find(l => l.name === row.location)
             ?? locations.find(l => l.name.toLowerCase() === row.location.toLowerCase())
             ?? locations.find(l => l.name.toLowerCase().includes(row.location.toLowerCase()));
    if (!loc) {
      results.push({ row: i + 1, status: "error", message: `Location "${row.location}" not found` });
      continue;
    }

    // Member lookup (by email; optional)
    let memberId: string | null = null;
    let isOpen = true;
    if (row.memberEmail) {
      const mem = members.find(m => m.user.email.toLowerCase() === row.memberEmail);
      if (!mem) {
        results.push({ row: i + 1, status: "error", message: `Member with email "${row.memberEmail}" not found` });
        continue;
      }
      memberId = mem.id;
      isOpen = false;
    }

    // Time parsing
    const [sh, sm] = row.startTime.split(":").map(Number);
    const [eh, em] = row.endTime.split(":").map(Number);
    const startsAt = new Date(`${row.date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`);
    let endsAt   = new Date(`${row.date}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`);
    if (isNaN(+startsAt) || isNaN(+endsAt)) {
      results.push({ row: i + 1, status: "error", message: "Invalid date or time" });
      continue;
    }
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400_000); // overnight wrap

    const publish = row.publish === true || row.publish === "true" || row.publish === "TRUE" || row.publish === "1";

    toCreate.push({
      locationId: loc.id,
      startsAt, endsAt,
      position: row.position ?? null,
      memberId,
      isOpen,
      notes: row.notes ?? null,
      status: publish ? "published" : "draft",
    });
    results.push({ row: i + 1, status: "ok" });
  }

  // Bulk create
  if (toCreate.length > 0) {
    await prisma.shift.createMany({ data: toCreate });
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "Shift",
    metadata: { imported: toCreate.length, total: parsed.data.rows.length, source: "csv_import" },
  });

  const summary = {
    total:    parsed.data.rows.length,
    created:  toCreate.length,
    errors:   results.filter(r => r.status === "error").length,
    skipped:  results.filter(r => r.status === "skipped").length,
  };
  return NextResponse.json({ summary, results });
}
