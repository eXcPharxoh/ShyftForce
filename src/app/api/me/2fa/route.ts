// 2FA setup + verify + disable. POST starts enrollment (returns secret + URI
// + recovery codes ONCE). PUT verifies the first code and flips totpEnabled.
// DELETE disables 2FA (requires current code or a recovery code).
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateSecret, otpauthUri, verifyCode, generateRecoveryCodes } from "@/lib/totp";

export async function GET() {
  const u = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { totpEnabled: true } });
  return NextResponse.json({ enabled: !!user?.totpEnabled });
}

// POST = start enrollment: generate secret, return otpauth URI + recovery codes.
// Secret is stored on user immediately but totpEnabled stays false until PUT.
export async function POST() {
  const u = await requireUser();
  const secret = generateSecret();
  const codes  = generateRecoveryCodes();
  const hashedCodes = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: u.id },
    data: {
      totpSecret:    secret,
      recoveryCodes: JSON.stringify(hashedCodes),
      totpEnabled:   false,
    },
  });

  return NextResponse.json({
    secret,
    uri: otpauthUri({ issuer: "ShyftForce", account: u.email, secret }),
    recoveryCodes: codes,
    instructions: "Add this secret to Google Authenticator / Authy / 1Password. Then verify a code via PUT to enable 2FA. Save the recovery codes — they're shown ONCE.",
  });
}

const VerifySchema = z.object({ code: z.string().length(6) }).strict();

export async function PUT(req: Request) {
  const u = await requireUser();
  const parsed = VerifySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { totpSecret: true, totpEnabled: true } });
  if (!user?.totpSecret) return NextResponse.json({ error: "Start enrollment first (POST)" }, { status: 400 });
  if (!verifyCode(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Invalid code. Check your authenticator app's clock." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: u.id }, data: { totpEnabled: true } });
  return NextResponse.json({ ok: true, enabled: true });
}

const DisableSchema = z.object({
  code:         z.string().length(6).optional(),
  recoveryCode: z.string().length(9).optional(), // "1234-5678" with hyphen
}).refine(v => v.code || v.recoveryCode, { message: "Code or recovery code required" });

export async function DELETE(req: Request) {
  const u = await requireUser();
  const parsed = DisableSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Code or recovery code required to disable 2FA" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { totpSecret: true, recoveryCodes: true, totpEnabled: true } });
  if (!user?.totpEnabled || !user.totpSecret) return NextResponse.json({ ok: true });

  let ok = false;
  if (parsed.data.code) {
    ok = verifyCode(user.totpSecret, parsed.data.code);
  } else if (parsed.data.recoveryCode) {
    const codes = user.recoveryCodes ? (JSON.parse(user.recoveryCodes) as string[]) : [];
    for (const hash of codes) {
      if (await bcrypt.compare(parsed.data.recoveryCode, hash)) { ok = true; break; }
    }
  }
  if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  await prisma.user.update({
    where: { id: u.id },
    data: { totpEnabled: false, totpSecret: null, recoveryCodes: null },
  });
  return NextResponse.json({ ok: true, enabled: false });
}
