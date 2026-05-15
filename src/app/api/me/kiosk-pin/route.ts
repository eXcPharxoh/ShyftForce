// Set or rotate the calling user's kiosk PIN. 4-6 digits, hashed before
// storage. Used to clock in/out at shared kiosk devices.
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const Schema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid PIN" }, { status: 400 });

  // Block trivially-weak PINs
  if (/^(.)\1+$/.test(parsed.data.pin) || ["1234", "12345", "123456", "0000", "00000", "000000"].includes(parsed.data.pin)) {
    return NextResponse.json({ error: "Pick something less guessable than that." }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.member.update({ where: { id: u.memberId }, data: { kioskPinHash: hash } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const u = await requireUser();
  await prisma.member.update({ where: { id: u.memberId }, data: { kioskPinHash: null } });
  return NextResponse.json({ ok: true });
}
