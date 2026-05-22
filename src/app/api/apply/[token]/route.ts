// Public, unauthenticated POST handler — anyone with the share link can apply.
// Rate-limited at the platform edge; we do basic IP + email collapsing here.
//
// GET returns the posting metadata so the public page can render the title,
// description, pay, location. POST creates the JobApplication record.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ApplySchema = z.object({
  name:        z.string().min(2).max(120),
  email:       z.string().email().max(180),
  phone:       z.string().max(40).optional().nullable(),
  resumeText:  z.string().max(20_000).optional().nullable(),
  resumeUrl:   z.string().url().max(500).optional().nullable(),
  coverLetter: z.string().max(8_000).optional().nullable(),
  source:      z.string().max(80).optional().nullable(),
}).strict();

async function findOpenPosting(token: string) {
  return prisma.jobPosting.findFirst({
    where: { publicToken: token, status: "open" },
    include: {
      organization: { select: { name: true } },
      location:     { select: { name: true } },
    },
  });
}

// Lightweight in-memory rate limiter for the public POST. Keyed by IP+token.
// Not distributed (per-instance), but stops a single source from flooding
// applications. The 30-day same-email de-dupe below is the second line.
const RL = new Map<string, { count: number; resetAt: number }>();
const RL_LIMIT = 5;
const RL_WINDOW_MS = 60_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow without bound.
  if (RL.size > 5000) {
    for (const [k, v] of RL) if (v.resetAt < now) RL.delete(k);
  }
  const e = RL.get(key);
  if (!e || e.resetAt < now) {
    RL.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  e.count++;
  return e.count > RL_LIMIT;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await findOpenPosting(token);
  if (!p) return NextResponse.json({ error: "Posting not available" }, { status: 404 });

  return NextResponse.json({
    posting: {
      title:          p.title,
      description:    p.description,
      position:       p.position,
      employmentType: p.employmentType,
      payMin: p.payMin, payMax: p.payMax, payPeriod: p.payPeriod,
      startDate:      p.startDate?.toISOString().slice(0, 10) ?? null,
      organization:   p.organization.name,
      location:       p.location?.name ?? null,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (rateLimited(`${clientIp(req)}|${token}`)) {
    return NextResponse.json({ error: "Too many submissions — please wait a moment and try again." }, { status: 429 });
  }

  const p = await findOpenPosting(token);
  if (!p) return NextResponse.json({ error: "Posting not available" }, { status: 404 });

  const parsed = ApplySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Soft de-dupe: same email, same posting, within 30 days → return the
  // existing record instead of creating a duplicate.
  const existing = await prisma.jobApplication.findFirst({
    where: {
      jobPostingId: p.id,
      email: parsed.data.email.toLowerCase().trim(),
      appliedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, id: existing.id });
  }

  const a = await prisma.jobApplication.create({
    data: {
      jobPostingId: p.id,
      name:         parsed.data.name.trim(),
      email:        parsed.data.email.toLowerCase().trim(),
      phone:        parsed.data.phone ?? null,
      resumeText:   parsed.data.resumeText ?? null,
      resumeUrl:    parsed.data.resumeUrl ?? null,
      coverLetter:  parsed.data.coverLetter ?? null,
      source:       parsed.data.source ?? null,
      status:       "new",
    },
  });

  return NextResponse.json({ ok: true, id: a.id });
}
