// Returns the current user's calendar subscription URL + lets them rotate it.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function feedUrl(req: Request, token: string) {
  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  // Always emit on the app subdomain so customers can paste it into Apple
  // Calendar without worrying about which domain they were on.
  const appHost = process.env.NEXT_PUBLIC_APP_HOST;
  const base = appHost ? `https://${appHost}` : origin;
  return `${base}/api/calendar/${token}/ical`;
}

export async function GET(req: Request) {
  const u = await requireUser();
  let member = await prisma.member.findUnique({ where: { id: u.memberId }, select: { calendarToken: true } });
  if (!member?.calendarToken) {
    const token = randomBytes(24).toString("hex");
    member = await prisma.member.update({ where: { id: u.memberId }, data: { calendarToken: token }, select: { calendarToken: true } });
  }
  return NextResponse.json({
    token: member.calendarToken,
    url:   feedUrl(req, member.calendarToken!),
    webcalUrl: feedUrl(req, member.calendarToken!).replace(/^https?:/, "webcal:"),
  });
}

// POST = rotate (invalidates the old URL)
export async function POST(req: Request) {
  const u = await requireUser();
  const token = randomBytes(24).toString("hex");
  await prisma.member.update({ where: { id: u.memberId }, data: { calendarToken: token } });
  return NextResponse.json({
    token,
    url:   feedUrl(req, token),
    webcalUrl: feedUrl(req, token).replace(/^https?:/, "webcal:"),
  });
}
