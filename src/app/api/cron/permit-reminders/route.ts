// Daily permit-reminder fan-out. Vercel cron hits this at 1pm UTC daily.
//
// For every permit:
//   - Compute days-until-expiry
//   - Find the most-relevant unfired cadence bucket (60 → 30 → 14 → 7 → 0 → expired)
//   - If that bucket hasn't been fired yet AND we've crossed its threshold,
//     send notifications to the right audience and stamp the bucket
//
// Audience rules:
//   - 60d / 30d: agency admins via email + dashboard (low urgency)
//   - 14d: admins + the affected guard (their licence — they care)
//   - 7d:  admins (SMS+push), guard (SMS+push)
//   - 0d:  ALL managers (SMS+push), the guard (SMS+push)
//   - expired: every manager (SMS+push); the guard cannot be scheduled

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendPush } from "@/lib/push";
import { Email, sendEmail } from "@/lib/email";
import { notifySlack } from "@/lib/slack";
import { permitLabel, permitCategory, REMINDER_DAYS } from "@/lib/permits/catalog";
import { statusFor } from "@/lib/permits/service";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req: Request) {
  // Auth — Vercel cron sends Bearer; ad-hoc invocation can use ?secret=
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  // Fail CLOSED: an unset CRON_SECRET must NOT skip auth.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (auth !== `Bearer ${expected}` && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Pull every permit that's either:
  //   - within 60 days of expiry
  //   - already expired (so we can fire the "expired" reminder once)
  const horizon = new Date(now.getTime() + 60 * 86400_000);
  const permits = await prisma.permit.findMany({
    where: { expiresOn: { lte: horizon } },
    include: {
      member: { include: { user: { select: { id: true, name: true } } } },
      organization: { select: { id: true, name: true } },
    },
  });

  let fired = 0;
  let skipped = 0;

  // Cache org admin lists per org so we don't N+1 by re-querying inside the loop
  const adminCache = new Map<string, { memberId: string; userId: string; phone: string | null; email: string; name: string }[]>();
  async function adminsFor(orgId: string) {
    if (adminCache.has(orgId)) return adminCache.get(orgId)!;
    const rows = await prisma.member.findMany({
      where: { organizationId: orgId, status: "active", role: { in: ["ADMIN", "MANAGER"] } },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const list = rows.map(r => ({
      memberId: r.id, userId: r.userId, phone: r.phone, email: r.user.email, name: r.user.name,
    }));
    adminCache.set(orgId, list);
    return list;
  }

  for (const p of permits) {
    const { days } = statusFor(p.expiresOn, now);
    // Decide which reminder bucket this permit is in TODAY
    // (the smallest threshold whose flag hasn't been set yet)
    let bucket: number | "expired" | null = null;
    if (days < 0 && !p.reminderExpiredSentAt) bucket = "expired";
    else if (days >= 0) {
      for (const t of REMINDER_DAYS) {
        if (days <= t) {
          const flagField = `reminder${t}dSentAt` as
            | "reminder60dSentAt" | "reminder30dSentAt" | "reminder14dSentAt" | "reminder7dSentAt";
          const dayField = "reminderDaySentAt";
          if (t === 0 && p.reminderDaySentAt == null) { bucket = 0; break; }
          if (t > 0 && (p as any)[flagField] == null) { bucket = t; break; }
        }
      }
    }
    if (bucket === null) { skipped++; continue; }

    const label = permitLabel(p);
    const cat = permitCategory(p.category);
    const niceDate = p.expiresOn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const subjectName = p.member?.user.name ?? "the agency";
    const isAgency = !p.memberId;

    // Compose copy per cadence
    const copyByBucket: Record<string, { subj: string; sms: string; pushTitle: string; pushBody: string; severity: "info" | "warn" | "urgent" | "critical" }> = {
      "60": {
        subj: `${label} — renewal due in ${days} days (${subjectName})`,
        sms:  `📋 ${label} renewal due in ${days}d for ${subjectName}. ${p.renewalUrl ?? ""}`,
        pushTitle: `Permit renewal in ${days} days`,
        pushBody:  `${label} for ${subjectName} expires ${niceDate}`,
        severity: "info",
      },
      "30": {
        subj: `${label} — 30-day reminder (${subjectName})`,
        sms:  `📋 ${label} expires in 30d for ${subjectName} (${niceDate}). Book renewal soon.`,
        pushTitle: `Permit renewal in 30 days`,
        pushBody:  `${label} for ${subjectName} expires ${niceDate}`,
        severity: "info",
      },
      "14": {
        subj: `URGENT — ${label} expires in 14 days (${subjectName})`,
        sms:  `⚠️ ${label} expires in 14d for ${subjectName}. Renew now to avoid disruption.`,
        pushTitle: `URGENT: 2 weeks left on permit`,
        pushBody:  `${label} for ${subjectName} expires ${niceDate}`,
        severity: "warn",
      },
      "7": {
        subj: `🚨 ${label} expires in 7 days (${subjectName})`,
        sms:  `🚨 7 days left: ${label} for ${subjectName}. Renew THIS week or they can't be scheduled.`,
        pushTitle: `🚨 7 days left on permit`,
        pushBody:  `${label} for ${subjectName} — book renewal today`,
        severity: "urgent",
      },
      "0": {
        subj: `🚨 ${label} EXPIRES TODAY (${subjectName})`,
        sms:  `🚨 EXPIRES TODAY: ${label} for ${subjectName}. After today, ${isAgency ? "the agency is unlicensed" : "they can't be scheduled"}.`,
        pushTitle: `🚨 Permit expires TODAY`,
        pushBody:  `${label} for ${subjectName}`,
        severity: "critical",
      },
      "expired": {
        subj: `🛑 ${label} EXPIRED (${subjectName})`,
        sms:  `🛑 EXPIRED: ${label} for ${subjectName}. ${isAgency ? "Agency is unlicensed." : "They are now blocked from new shifts."}`,
        pushTitle: `🛑 Permit expired`,
        pushBody:  `${label} for ${subjectName} — blocked from scheduling`,
        severity: "critical",
      },
    };
    const c = copyByBucket[String(bucket)];

    const admins = await adminsFor(p.organizationId);

    // Fan-out: always admins; the affected guard joins at 14d+
    const recipients: { userId: string; phone: string | null; email: string; name: string }[] = admins.map(a => ({
      userId: a.userId, phone: a.phone, email: a.email, name: a.name,
    }));
    const shouldNotifyGuard = p.memberId && (bucket === 14 || bucket === 7 || bucket === 0);
    if (shouldNotifyGuard && p.member) {
      // Avoid duplicate if the guard happens to also be a manager
      if (!recipients.find(r => r.userId === p.member!.user.id)) {
        recipients.push({
          userId: p.member.user.id,
          phone:  p.member.phone,
          email:  "", // we have it via the relation but didn't pull it; skip email-to-guard, SMS/push is enough
          name:   p.member.user.name,
        });
      }
    }

    // Send via every channel in parallel
    await Promise.all(recipients.map(async r => {
      // Push
      await sendPush(r.userId, {
        title: c.pushTitle, body: c.pushBody,
        url: "/settings/permits", tag: `permit-${p.id}`,
      }).catch(() => {});

      // SMS at 14d+ severity only — keep the cadence kind
      if ((bucket === 14 || bucket === 7 || bucket === 0 || bucket === "expired") && r.phone) {
        await sendSms({
          organizationId: p.organizationId,
          memberId: null, // sent to a User; we don't have a stable Member for managers picked from other orgs (won't happen but defensive)
          toNumber: r.phone, body: c.sms,
          category: "alert", bypassOptIn: bucket === "expired" || bucket === 0,
        }).catch(() => {});
      }

      // Email at every threshold for admins (skip if no email — that means guard recipient)
      if (r.email) {
        await sendEmail({
          to: r.email, subject: c.subj,
          html: simpleEmail({ title: c.subj, body: c.sms, ctaLabel: "Open permits", ctaUrl: appUrl("/settings/permits"), footer: p.renewalUrl ? `Renew at: ${p.renewalUrl}` : undefined }),
        }).catch(() => {});
      }
    }));

    // Slack (best-effort, fire-and-forget; org-wide notification)
    notifySlack({
      organizationId: p.organizationId,
      category: c.severity === "critical" ? "incident" : "approval",
      text: c.subj,
    }).catch(() => {});

    // Mark the bucket fired
    const update: any = {};
    if (bucket === "expired") update.reminderExpiredSentAt = now;
    else if (bucket === 0)    update.reminderDaySentAt = now;
    else                      update[`reminder${bucket}dSentAt`] = now;
    await prisma.permit.update({ where: { id: p.id }, data: update });
    fired++;
  }

  return NextResponse.json({ ok: true, scanned: permits.length, fired, skipped });
}

function simpleEmail(opts: { title: string; body: string; ctaLabel: string; ctaUrl: string; footer?: string }) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px">
  <table align="center" cellpadding="0" cellspacing="0" width="560" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#0f172a">
      <span style="display:inline-block;background:#f97316;color:#fff;width:24px;height:24px;border-radius:6px;text-align:center;line-height:24px;margin-right:8px">⚡</span>shyftforce
    </td></tr>
    <tr><td style="padding:32px 28px;color:#0f172a">
      <h1 style="font-size:20px;margin:0 0 12px">${opts.title}</h1>
      <p style="margin:0 0 24px;line-height:1.55;color:#334155">${opts.body}</p>
      <a href="${opts.ctaUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${opts.ctaLabel}</a>
      ${opts.footer ? `<p style="margin-top:24px;font-size:12px;color:#64748b">${opts.footer}</p>` : ""}
    </td></tr>
  </table></body></html>`;
}

export const GET = handler;
export const POST = handler;
