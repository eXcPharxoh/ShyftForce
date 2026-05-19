// Substitute teacher callout service. When a teacher calls out, we
// broadcast SMS + in-app DM to matched subs and the first to claim wins.
import { prisma } from "@/lib/prisma";
import { smsAlert } from "@/lib/sms";

const DEFAULT_EXPIRY_HOURS = 4;

function matchScore(sub: { subjects: string[]; grades: string[] }, needed: { subjects: string[]; grades: string[] }): number {
  let score = 0;
  if (needed.subjects.length === 0) score += 1; // any-subject sub is okay
  else if (sub.subjects.some(s => needed.subjects.includes(s))) score += 3;
  if (needed.grades.length === 0) score += 1;
  else if (sub.grades.some(g => needed.grades.includes(g))) score += 2;
  return score;
}

function withinContactWindow(sub: { preferredContactHour: number | null; latestContactHour: number | null }, hour: number): boolean {
  const start = sub.preferredContactHour ?? 0;
  const end   = sub.latestContactHour ?? 23;
  return hour >= start && hour <= end;
}

/** Trigger a callout for a teacher's shift. Returns the SubCallout record. */
export async function startCallout(opts: {
  organizationId: string;
  shiftId:        string;
  triggeredById?: string | null;
  subjects?:      string[];
  grades?:        string[];
  notes?:         string | null;
  baseUrl:        string; // for the claim links
}) {
  // Check the shift exists in the org
  const shift = await prisma.shift.findFirst({
    where: { id: opts.shiftId, location: { organizationId: opts.organizationId } },
    include: { location: true, member: { include: { user: true } } },
  });
  if (!shift) throw new Error("Shift not in org");

  // Don't allow duplicate callouts for the same shift
  const existing = await prisma.subCallout.findUnique({
    where: { shiftId: opts.shiftId },
    include: { offers: true },
  });
  if (existing) {
    if (existing.status === "open") return existing;
    throw new Error(`This shift already had a callout: ${existing.status}`);
  }

  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3600_000);

  // Find matched subs
  const subjects = opts.subjects ?? [];
  const grades   = opts.grades ?? [];

  const pool = await prisma.subPoolMember.findMany({
    where: { organizationId: opts.organizationId, isActive: true },
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  const nowHour = new Date().getHours();
  const matched = pool
    .map(s => {
      const subSubjects = s.subjects ? (JSON.parse(s.subjects) as string[]) : [];
      const subGrades   = s.grades   ? (JSON.parse(s.grades)   as string[]) : [];
      return {
        sub: s,
        score: matchScore({ subjects: subSubjects, grades: subGrades }, { subjects, grades }),
        inWindow: withinContactWindow(s, nowHour),
      };
    })
    .filter(m => m.score > 0 && m.inWindow)
    .sort((a, b) => b.score - a.score);

  // Create callout + offers atomically
  const callout = await prisma.subCallout.create({
    data: {
      organizationId: opts.organizationId,
      shiftId:        opts.shiftId,
      triggeredById:  opts.triggeredById ?? null,
      subjects:       subjects.length > 0 ? JSON.stringify(subjects) : null,
      grades:         grades.length > 0   ? JSON.stringify(grades)   : null,
      notes:          opts.notes ?? null,
      expiresAt,
      offers: {
        create: matched.map(m => ({ subPoolId: m.sub.id })),
      },
    },
    include: { offers: true },
  });

  // SMS the matched subs in parallel
  const when = shift.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const subjectsLabel = subjects.length ? subjects.join("/") : "Class";
  const teacherName = shift.member?.user.name ? `${shift.member.user.name}` : "A teacher";

  await Promise.allSettled(callout.offers.map(async (offer) => {
    const sub = pool.find(p => p.id === offer.subPoolId);
    if (!sub) return;
    const m = await prisma.member.findUnique({ where: { id: sub.memberId }, select: { phone: true } });
    if (!m?.phone) return;
    const claimUrl = `${opts.baseUrl.replace(/\/$/, "")}/sub-callout/claim/${offer.claimToken}`;
    await smsAlert({
      organizationId: opts.organizationId,
      memberId: sub.memberId,
      phone: m.phone,
      body: `📣 Sub needed: ${teacherName} called out — ${subjectsLabel}, ${shift.location.name}, ${when}. First to claim wins: ${claimUrl}`,
    }).catch(() => {});
  }));

  return callout;
}

/** Atomic claim. Only the first sub through wins. */
export async function claimByToken(claimToken: string): Promise<{
  ok: boolean;
  error?: string;
  shift?: { id: string; locationName: string; startsAt: Date; endsAt: Date };
}> {
  return await prisma.$transaction(async (tx) => {
    const offer = await tx.subCalloutOffer.findUnique({
      where: { claimToken },
      include: {
        callout: { include: { shift: { include: { location: true } } } },
        sub: true,
      },
    });
    if (!offer) return { ok: false, error: "Link not found" };
    if (offer.callout.status !== "open") return { ok: false, error: "Already filled or canceled" };
    if (offer.callout.expiresAt < new Date()) {
      await tx.subCallout.update({ where: { id: offer.callout.id }, data: { status: "expired" } });
      return { ok: false, error: "Expired" };
    }

    // Atomic claim — only succeeds if callout is still open
    const claim = await tx.subCallout.updateMany({
      where: { id: offer.callout.id, status: "open" },
      data:  { status: "filled", filledById: offer.sub.memberId, filledAt: new Date() },
    });
    if (claim.count === 0) return { ok: false, error: "Beaten to it — someone else just claimed this." };

    // Assign the sub to the shift
    await tx.shift.update({
      where: { id: offer.callout.shiftId },
      data:  { memberId: offer.sub.memberId, isOpen: false, status: "published" },
    });

    // Mark this offer accepted, supersede the rest
    await tx.subCalloutOffer.update({
      where: { id: offer.id },
      data:  { status: "accepted", respondedAt: new Date() },
    });
    await tx.subCalloutOffer.updateMany({
      where: { calloutId: offer.callout.id, status: "pending", NOT: { id: offer.id } },
      data:  { status: "superseded", respondedAt: new Date() },
    });

    return {
      ok: true,
      shift: {
        id: offer.callout.shift.id,
        locationName: offer.callout.shift.location.name,
        startsAt: offer.callout.shift.startsAt,
        endsAt:   offer.callout.shift.endsAt,
      },
    };
  });
}
