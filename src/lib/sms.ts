// SMS adapter. Per-org BYO Twilio (recommended for production scale) with
// platform fallback for dev / new customers. Falls back to console log in dev
// so the rest of the app keeps working without Twilio credentials.
//
// Every send is logged to SmsMessage for audit + rate-limit + abuse detection.

import { prisma } from "@/lib/prisma";

type SmsCategory = "shift_offer" | "schedule_change" | "time_off" | "alert" | "test";

type SendArgs = {
  organizationId: string;
  toNumber:       string;
  body:           string;
  category:       SmsCategory;
  memberId?:      string | null;
  /** Skip the member's opt-in/quiet-hours check. Reserved for compliance-critical alerts. */
  bypassOptIn?:   boolean;
};

type SendResult = { ok: boolean; sid?: string; error?: string; skipped?: string };

// E.164 normalizer — accepts "+1 (555) 123-4567" or "5551234567"
function normalizePhone(input: string, defaultCountry = "+1"): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return defaultCountry + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

function withinQuietHours(now: Date, start: number | null, end: number | null): boolean {
  if (start == null || end == null) return false;
  const h = now.getHours();
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  // wraps midnight (e.g. 22 → 7)
  return h >= start || h < end;
}

/** Sends an SMS, respecting member preferences + quiet hours. Logs every attempt. */
export async function sendSms(args: SendArgs): Promise<SendResult> {
  const phone = normalizePhone(args.toNumber);
  if (!phone) {
    await logSms({ ...args, status: "failed", error: "Invalid phone number" });
    return { ok: false, error: "Invalid phone number" };
  }

  // Member preference check
  if (args.memberId && !args.bypassOptIn) {
    const member = await prisma.member.findUnique({
      where: { id: args.memberId },
      select: {
        smsOptIn: true,
        smsOptInShiftOffer: true, smsOptInScheduleChange: true,
        smsOptInTimeOff: true, smsOptInAlerts: true,
        smsQuietStartHour: true, smsQuietEndHour: true,
      },
    });
    if (!member?.smsOptIn) {
      return { ok: false, skipped: "member opted out of SMS" };
    }
    const optedIn =
      args.category === "shift_offer"     ? member.smsOptInShiftOffer :
      args.category === "schedule_change" ? member.smsOptInScheduleChange :
      args.category === "time_off"        ? member.smsOptInTimeOff :
      args.category === "alert"           ? member.smsOptInAlerts :
      true;
    if (!optedIn) return { ok: false, skipped: `member opted out of ${args.category}` };
    if (withinQuietHours(new Date(), member.smsQuietStartHour, member.smsQuietEndHour)) {
      return { ok: false, skipped: "quiet hours" };
    }
  }

  // Resolve Twilio creds: org-level BYO first, then platform fallback
  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: { twilioAccountSid: true, twilioAuthToken: true, twilioFromNumber: true },
  });
  const sid   = org?.twilioAccountSid  ?? process.env.TWILIO_ACCOUNT_SID;
  const token = org?.twilioAuthToken   ?? process.env.TWILIO_AUTH_TOKEN;
  const from  = org?.twilioFromNumber  ?? process.env.TWILIO_FROM_NUMBER;

  // Dev / unconfigured fallback — log + return ok
  if (!sid || !token || !from) {
    console.log(`📱 [SMS → ${phone}] (${args.category}) ${args.body}`);
    await logSms({ ...args, status: "sent", error: "console_fallback" });
    return { ok: true, skipped: "no twilio credentials configured (logged to console)" };
  }

  // Twilio REST call (no SDK to keep the bundle lean)
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: from, To: phone, Body: args.body.slice(0, 1500) }),
    });
    const data = await res.json();
    if (!res.ok) {
      await logSms({ ...args, status: "failed", error: data?.message ?? `Twilio HTTP ${res.status}` });
      return { ok: false, error: data?.message ?? `Twilio HTTP ${res.status}` };
    }
    await logSms({ ...args, status: "sent", twilioSid: data.sid });
    return { ok: true, sid: data.sid };
  } catch (e: any) {
    await logSms({ ...args, status: "failed", error: e?.message ?? "twilio error" });
    return { ok: false, error: e?.message ?? "twilio error" };
  }
}

async function logSms(opts: SendArgs & { status: "sent" | "failed" | "queued"; error?: string; twilioSid?: string }) {
  try {
    await prisma.smsMessage.create({
      data: {
        organizationId: opts.organizationId,
        memberId: opts.memberId ?? null,
        toNumber: opts.toNumber,
        body: opts.body,
        category: opts.category,
        status: opts.status,
        errorMessage: opts.error ?? null,
        twilioSid: opts.twilioSid ?? null,
        sentAt: opts.status === "sent" ? new Date() : null,
      },
    });
  } catch (e) {
    console.error("[sms] failed to log message:", e);
  }
}

// ---------- Convenience helpers wired to common events ----------

export async function smsShiftOffer(args: {
  organizationId: string; memberId: string; phone: string;
  position: string; locationName: string; startsAt: Date; expiresAt: Date; offerUrl: string;
}) {
  const when = args.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return sendSms({
    organizationId: args.organizationId, memberId: args.memberId, toNumber: args.phone,
    category: "shift_offer",
    body: `📅 Shift available: ${args.position} at ${args.locationName} on ${when}. Reply or claim at ${args.offerUrl}`,
  });
}

export async function smsScheduleChange(args: {
  organizationId: string; memberId: string; phone: string;
  changeType: "added" | "moved" | "canceled"; position: string; locationName: string; startsAt: Date; url: string;
}) {
  const when = args.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const verb = args.changeType === "added" ? "added" : args.changeType === "moved" ? "moved" : "canceled";
  return sendSms({
    organizationId: args.organizationId, memberId: args.memberId, toNumber: args.phone,
    category: "schedule_change",
    body: `🔔 Shift ${verb}: ${args.position} at ${args.locationName} · ${when}. Details: ${args.url}`,
  });
}

export async function smsTimeOffDecision(args: {
  organizationId: string; memberId: string; phone: string;
  decision: "approved" | "rejected"; startsOn: Date; endsOn: Date;
}) {
  const range = `${args.startsOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${args.endsOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return sendSms({
    organizationId: args.organizationId, memberId: args.memberId, toNumber: args.phone,
    category: "time_off",
    body: `🌙 Time off ${args.decision.toUpperCase()}: ${range}.`,
  });
}

export async function smsAlert(args: {
  organizationId: string; memberId?: string; phone: string; body: string; bypassOptIn?: boolean;
}) {
  return sendSms({
    organizationId: args.organizationId, memberId: args.memberId ?? null, toNumber: args.phone,
    category: "alert", body: args.body, bypassOptIn: args.bypassOptIn,
  });
}
