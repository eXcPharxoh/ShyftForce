// CSV bulk import for construction equipment.
// Expected headers: name,category,serialNumber,notes
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv/parse";

const Schema = z.object({ csv: z.string().min(5).max(500_000) });
const ALLOWED_CATEGORIES = new Set(["tool", "machine", "scaffolding", "safety_gear", "other"]);

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Missing csv" }, { status: 400 });

  const parseResult = parseCsv(parsed.data.csv);
  if (!parseResult) return NextResponse.json({ error: "Could not parse CSV" }, { status: 400 });
  if (!parseResult.headers.includes("name")) {
    return NextResponse.json({ error: "CSV must include 'name' column" }, { status: 400 });
  }

  const results: { name: string; status: "created" | "error"; error?: string }[] = [];
  for (const row of parseResult.rows) {
    const name = (row.name ?? "").trim();
    if (!name) { results.push({ name: "(blank)", status: "error", error: "missing name" }); continue; }
    const category = (row.category || "tool").toLowerCase();
    if (!ALLOWED_CATEGORIES.has(category)) {
      results.push({ name, status: "error", error: `invalid category "${category}"` });
      continue;
    }
    try {
      await prisma.equipment.create({
        data: {
          organizationId: u.organizationId,
          name,
          category,
          serialNumber: row.serialNumber || null,
          notes: row.notes || null,
        },
      });
      results.push({ name, status: "created" });
    } catch (e: any) {
      results.push({ name, status: "error", error: e.message?.slice(0, 100) ?? "failed" });
    }
  }
  const summary = {
    created: results.filter(r => r.status === "created").length,
    errors:  results.filter(r => r.status === "error").length,
  };
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Equipment", entityId: "bulk-import",
    metadata: summary,
  });
  return NextResponse.json({ ok: true, summary, results });
}
