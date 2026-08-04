// TEMPORARY read-only diagnostic. Dumps production's actual schema so it can be
// diffed against prisma/schema.prisma locally. Production runs on a different
// Neon database than the one in the Neon console, and its DATABASE_URL is a
// Sensitive Vercel var that cannot be read back — so the deployment itself has
// to report what it sees.
//
// Read-only: no DDL, no DML, no credentials returned. Delete once repaired.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TOKEN = "sf-dbinfo-4f19c7";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const meta = (await prisma.$queryRawUnsafe(
      `SELECT current_database() AS db, current_user AS usr`
    )) as any[];

    // Full column inventory, compacted to "table:col,col,col" lines.
    const cols = (await prisma.$queryRawUnsafe(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema='public' ORDER BY table_name, column_name`
    )) as any[];
    const byTable: Record<string, string[]> = {};
    for (const c of cols) (byTable[c.table_name] ||= []).push(c.column_name);

    const enums = (await prisma.$queryRawUnsafe(
      `SELECT t.typname AS name FROM pg_type t
         JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typtype='e' AND n.nspname='public' ORDER BY 1`
    ).catch(() => [])) as any[];

    const migs = (await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations" ORDER BY started_at`
    ).catch(() => [])) as any[];

    const rawUrl = process.env.DATABASE_URL || "";
    const host = (rawUrl.match(/@([^/:?]+)/) || [])[1] || "(unknown)";

    return NextResponse.json({
      host,
      database: meta[0]?.db ?? null,
      tableCount: Object.keys(byTable).length,
      schema: byTable,
      enums: enums.map((e) => e.name),
      migrationsRecorded: migs.map((m) => m.migration_name),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "query failed", code: e?.code ?? null, message: (e?.message ?? "").slice(0, 300) },
      { status: 500 },
    );
  }
}
