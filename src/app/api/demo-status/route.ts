// Tiny public endpoint the login page hits to decide whether to show the
// "ONE-CLICK DEMO" panel. We hide it unless the demo org has actually been
// seeded (otherwise the buttons return "Invalid credentials" and look broken).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Cheap existence check on the seed user — same identifier used by the demo
  // buttons. If they exist, the demo is usable.
  const user = await prisma.user.findFirst({
    where: { email: "admin@platinum.com" },
    select: { id: true },
  }).catch(() => null);
  return NextResponse.json({ exists: !!user });
}
