// One-shot endpoint to seed the Platinum Security demo org into the production
// database. Gated by the CRON_SECRET env var so only the platform owner can hit it.
//
//   POST /api/admin/seed-demo?secret=<CRON_SECRET>
//
// Refuses if the database already has an org (unless &force=1 is also passed).
// On force, runs a destructive deleteMany() across every table.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runDemoSeed } from "@/lib/seed/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const force  = url.searchParams.get("force") === "1";

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not set on this deploy" }, { status: 500 });
  }
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized — pass ?secret=<CRON_SECRET>" }, { status: 401 });
  }

  const existingOrgs = await prisma.organization.count();
  if (existingOrgs > 0 && !force) {
    return NextResponse.json({
      error: `Database has ${existingOrgs} organization(s) already. Pass &force=1 to wipe + reseed.`,
      existingOrgs,
    }, { status: 400 });
  }

  try {
    const summary = await runDemoSeed(prisma as any);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e: any) {
    // Log full error server-side; never leak stack traces to clients.
    console.error("[seed-demo] failed:", e);
    return NextResponse.json({ error: "Seed failed — see server logs." }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
