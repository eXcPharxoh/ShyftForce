// Twilio inbound SMS webhook. Twilio POSTs form-encoded body with From, To,
// Body. We look up the member by phone, run the AI replier, and respond with
// TwiML that Twilio uses to send the reply SMS.
//
// Configure in Twilio console:
//   Phone Numbers → your number → Messaging → A MESSAGE COMES IN →
//   webhook → https://app.shyftforce.com/api/sms/inbound  (POST)
//
// Security: Twilio signs each request with X-Twilio-Signature using your auth
// token. We verify when TWILIO_AUTH_TOKEN is configured.

import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { replyToMessage } from "@/lib/replier/ai";
import type { SessionUser } from "@/lib/session";

function twiml(message: string): string {
  // Escape XML special chars
  const safe = message
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${safe}</Message></Response>`;
}

function noReply(): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`, {
    status: 200, headers: { "Content-Type": "text/xml" },
  });
}

// Twilio signature spec: HMAC-SHA1 over URL + sorted form params concatenated.
function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string, authToken: string): boolean {
  const sorted = Object.keys(params).sort().map(k => k + params[k]).join("");
  const data = url + sorted;
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return expected === signature;
}

function normalizePhone(p: string): string {
  return (p || "").replace(/[^\d+]/g, "");
}

export async function POST(req: Request) {
  const url = req.url;
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  // Signature verification (skip in dev if no auth token)
  const sig = req.headers.get("x-twilio-signature");
  if (process.env.TWILIO_AUTH_TOKEN && sig) {
    if (!verifyTwilioSignature(url, params, sig, process.env.TWILIO_AUTH_TOKEN)) {
      console.warn("[sms/inbound] Twilio signature mismatch");
      return noReply();
    }
  }

  const from = normalizePhone(params.From ?? "");
  const body = (params.Body ?? "").trim();
  if (!from || !body) return noReply();

  // STOP/UNSUBSCRIBE etiquette — Twilio handles platform-level opt-out, but
  // mirror it in our state so we don't try to send anything either.
  const upper = body.toUpperCase();
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "END", "QUIT", "CANCEL"].includes(upper)) {
    const member = await prisma.member.findFirst({ where: { phone: { contains: from.slice(-10) } } });
    if (member) {
      await prisma.member.update({ where: { id: member.id }, data: { smsOptIn: false } });
    }
    return new Response(twiml("You're unsubscribed. Reply START to re-enable shyftforce texts."), {
      status: 200, headers: { "Content-Type": "text/xml" },
    });
  }
  if (["START", "UNSTOP", "YES"].includes(upper)) {
    const member = await prisma.member.findFirst({ where: { phone: { contains: from.slice(-10) } } });
    if (member) await prisma.member.update({ where: { id: member.id }, data: { smsOptIn: true } });
    return new Response(twiml("You're back on. You'll get shift offers, schedule changes, and time-off updates by text."), {
      status: 200, headers: { "Content-Type": "text/xml" },
    });
  }

  // Find member by last 10 digits of phone (US/CA-friendly)
  const last10 = from.slice(-10);
  const member = await prisma.member.findFirst({
    where: { phone: { contains: last10 } },
    include: { user: true, organization: true, location: true },
  });
  if (!member) {
    return new Response(twiml("Hi — this number isn't linked to a shyftforce account. Ask your manager to add your phone number in your member profile."), {
      status: 200, headers: { "Content-Type": "text/xml" },
    });
  }

  // Build a SessionUser-shaped object so the replier can call our scoped tools
  const sessionUser: SessionUser = {
    id: member.userId,
    email: member.user.email,
    name: member.user.name,
    image: member.user.avatar,
    memberId: member.id,
    role: (member.role as any) ?? "EMPLOYEE",
    organizationId: member.organizationId,
    organizationName: member.organization.name,
    organizationIndustry: member.organization.industry,
    locationId: member.locationId,
    impersonatedByUserId: null,
    impersonatedByEmail: null,
  };

  const reply = await replyToMessage({ user: sessionUser, userMessage: body, viaSms: true });
  // Log the conversation for audit
  await prisma.smsMessage.create({
    data: {
      organizationId: member.organizationId,
      memberId: member.id,
      toNumber: from,
      body: `[INBOUND] ${body}\n[REPLY] ${reply.text}`,
      category: "alert", status: "sent",
      sentAt: new Date(),
    },
  }).catch(() => {});

  return new Response(twiml(reply.text), { status: 200, headers: { "Content-Type": "text/xml" } });
}
