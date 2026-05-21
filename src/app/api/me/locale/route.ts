// PATCH /api/me/locale  → update the current user's locale preference.
// Body: { locale: "en" | "fr" | "es" }
// Persists on Member.locale so it survives sign-out + propagates to SMS / emails.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const Schema = z.object({ locale: z.enum(["en", "fr", "es"]) }).strict();

export async function PATCH(req: Request) {
  const u = await requireUser();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

  await prisma.member.update({
    where: { id: u.memberId },
    data: { locale: parsed.data.locale },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Member", entityId: u.memberId,
    metadata: { locale: parsed.data.locale, change: "user_pref" },
  });

  return NextResponse.json({ ok: true, locale: parsed.data.locale });
}
