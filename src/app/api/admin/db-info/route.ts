// TEMPORARY read-only diagnostic. Reports WHICH database this deployment is
// actually connected to, so we can find the one that's missing the `uxMode`
// column (prod is drifted while the Neon project in the console is clean —
// they are different databases).
//
// Read-only: no DDL, no DML, no credentials returned. Delete once prod schema
// is repaired.
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
      `SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS server_ip`
    )) as any[];

    const cols = (await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='Organization' ORDER BY 1`
    )) as any[];
    const colNames = cols.map((c) => c.column_name);

    const migs = (await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations" ORDER BY started_at`
    ).catch(() => [])) as any[];

    // Row counts so we can tell which database holds the real data.
    const [orgs, users, members] = await Promise.all([
      prisma.organization.count().catch(() => -1),
      prisma.user.count().catch(() => -1),
      prisma.member.count().catch(() => -1),
    ]);

    // Host comes from the env var, stripped of credentials.
    const raw = process.env.DATABASE_URL || "";
    const host = (raw.match(/@([^/:?]+)/) || [])[1] || "(unknown)";

    return NextResponse.json({
      host,
      database: meta[0]?.db ?? null,
      user: meta[0]?.usr ?? null,
      serverIp: meta[0]?.server_ip ?? null,
      hasUxMode: colNames.includes("uxMode"),
      organizationColumnCount: colNames.length,
      counts: { organizations: orgs, users, members },
      migrationsRecorded: migs.map((m) => m.migration_name),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "query failed", code: e?.code ?? null, message: (e?.message ?? "").slice(0, 300) },
      { status: 500 },
    );
  }
}
