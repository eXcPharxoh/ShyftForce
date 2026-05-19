// CSV bulk import for hotel rooms.
// Expected headers: number,floor,type,notes
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv/parse";

const Schema = z.object({ csv: z.string().min(5).max(500_000) });

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Missing csv" }, { status: 400 });

  const parseResult = parseCsv(parsed.data.csv);
  if (!parseResult) return NextResponse.json({ error: "Could not parse CSV (need header row + at least 1 data row)" }, { status: 400 });

  if (!parseResult.headers.includes("number")) {
    return NextResponse.json({ error: "CSV must include 'number' column" }, { status: 400 });
  }

  const results: { number: string; status: "created" | "skipped" | "error"; error?: string }[] = [];
  for (const row of parseResult.rows) {
    const number = (row.number ?? "").trim();
    if (!number) { results.push({ number: "(blank)", status: "error", error: "missing number" }); continue; }
    try {
      const existing = await prisma.hotelRoom.findFirst({
        where: { organizationId: u.organizationId, number },
        select: { id: true },
      });
      if (existing) { results.push({ number, status: "skipped", error: "already exists" }); continue; }
      await prisma.hotelRoom.create({
        data: {
          organizationId: u.organizationId,
          number,
          floor: row.floor ? parseInt(row.floor, 10) || null : null,
          type:  (row.type || "standard").toLowerCase(),
          notes: row.notes || null,
        },
      });
      results.push({ number, status: "created" });
    } catch (e: any) {
      results.push({ number, status: "error", error: e.message?.slice(0, 100) ?? "failed" });
    }
  }

  const summary = {
    created:  results.filter(r => r.status === "created").length,
    skipped:  results.filter(r => r.status === "skipped").length,
    errors:   results.filter(r => r.status === "error").length,
  };
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "HotelRoom", entityId: "bulk-import",
    metadata: summary,
  });
  return NextResponse.json({ ok: true, summary, results });
}
