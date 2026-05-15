// AI-style turnover risk model. Pure heuristic over data we already have —
// no external ML required. Each input contributes 0-100 risk points; we cap
// total score at 100 and explain it with the top contributors.
//
// Inputs (last 60 days unless noted):
//   - declined shift-offer rate
//   - no-show / late-clock-in count
//   - declining acceptance over time (recent half vs older half)
//   - kudos received (negative weight — recognition is protective)
//   - tenure (shorter = higher risk per industry research)
//   - upcoming time-off requests (planning to quit often shows here)
//   - last 7-day messenger activity vs prior trend (negative = checked out)

import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/utils";

export type RiskFactor = {
  key:   string;
  label: string;
  points: number;   // 0-100 contribution
  detail: string;
};

export type MemberRisk = {
  memberId:    string;
  memberName:  string;
  position:    string | null;
  locationName: string | null;
  score:       number;    // 0-100 capped
  band:        "low" | "medium" | "high";
  topFactors:  RiskFactor[];   // top 3 contributors
  topPositive: RiskFactor[];   // top 2 protective factors
};

const RISK_BANDS = { medium: 35, high: 65 } as const;

export async function scoreOrg(organizationId: string): Promise<MemberRisk[]> {
  const since60 = addDays(new Date(), -60);
  const since30 = addDays(new Date(), -30);
  const since14 = addDays(new Date(), -14);

  const members = await prisma.member.findMany({
    where: { organizationId, status: "active", role: { not: "ADMIN" } },
    include: {
      user: { select: { name: true } },
      location: { select: { name: true } },
      openShiftOffers: { where: { sentAt: { gte: since60 } }, select: { status: true, sentAt: true } },
      attendanceLogs: { where: { at: { gte: since60 }, type: "clock_in" }, select: { at: true } },
      kudosReceived: { where: { createdAt: { gte: since60 } }, select: { createdAt: true } },
      timeOffRequests: { where: { createdAt: { gte: since30 } }, select: { createdAt: true, status: true } },
      messagesSent: { where: { createdAt: { gte: since60 } }, select: { createdAt: true } },
    },
  });

  const tenureMonths = (hire: Date) => Math.max(0, (Date.now() - +hire) / (30 * 86400_000));

  return members.map(m => {
    const factors: RiskFactor[] = [];
    const positive: RiskFactor[] = [];

    // 1. Declined shift-offer rate
    const offered = m.openShiftOffers.length;
    if (offered >= 3) {
      const declined = m.openShiftOffers.filter(o => o.status === "declined" || o.status === "expired").length;
      const declineRate = declined / offered;
      const pts = Math.round(Math.min(28, declineRate * 40));
      if (pts >= 6) {
        factors.push({
          key: "decline_rate", label: "Declining shift offers",
          points: pts, detail: `${Math.round(declineRate * 100)}% decline rate (${declined}/${offered} offers last 60d)`,
        });
      }
    }

    // 2. Trend: recent decline rate vs prior — is acceptance worsening?
    if (offered >= 4) {
      const split = new Date(since30.getTime() - (Date.now() - +since60) / 2);
      const recent = m.openShiftOffers.filter(o => +o.sentAt > +split);
      const prior  = m.openShiftOffers.filter(o => +o.sentAt <= +split);
      if (recent.length >= 2 && prior.length >= 2) {
        const rRate = recent.filter(o => o.status === "declined" || o.status === "expired").length / recent.length;
        const pRate = prior.filter(o => o.status === "declined" || o.status === "expired").length / prior.length;
        if (rRate - pRate > 0.2) {
          factors.push({
            key: "trend_decline", label: "Acceptance dropping",
            points: Math.round(Math.min(18, (rRate - pRate) * 80)),
            detail: `Decline rate up ${Math.round((rRate - pRate) * 100)}pp recently`,
          });
        }
      }
    }

    // 3. Tenure (newer = higher risk)
    const months = tenureMonths(m.hireDate);
    if (months < 3) {
      factors.push({ key: "tenure", label: "New hire", points: 15, detail: `Tenure ${months.toFixed(1)} mo (< 3 months)` });
    } else if (months < 6) {
      factors.push({ key: "tenure", label: "Short tenure", points: 8, detail: `Tenure ${months.toFixed(1)} mo` });
    } else if (months > 24) {
      positive.push({ key: "tenure_long", label: "Long tenure", points: 10, detail: `${months.toFixed(0)} months on team` });
    }

    // 4. Kudos last 60d (negative = protective)
    if (m.kudosReceived.length >= 3) {
      positive.push({ key: "kudos", label: "Frequently recognized", points: 15, detail: `${m.kudosReceived.length} kudos last 60d` });
    } else if (m.kudosReceived.length === 0 && months >= 3) {
      factors.push({ key: "no_kudos", label: "No recognition", points: 12, detail: "0 kudos received in 60d" });
    }

    // 5. Engagement: messenger activity. Trend down = checked out.
    const msgsRecent = m.messagesSent.filter(x => +x.createdAt > +since14).length;
    const msgsPrior  = m.messagesSent.filter(x => +x.createdAt <= +since14).length;
    if (msgsPrior >= 3 && msgsRecent === 0) {
      factors.push({ key: "msg_silence", label: "Gone silent", points: 14, detail: "Used to message but hasn't in 2 weeks" });
    }

    // 6. Multiple recent time-off requests (esp. unusual category)
    if (m.timeOffRequests.length >= 2) {
      factors.push({
        key: "time_off_spike", label: "Multiple time-off requests",
        points: Math.min(15, 6 + m.timeOffRequests.length * 3),
        detail: `${m.timeOffRequests.length} requests in last 30d`,
      });
    }

    // 7. Sparse clock-ins relative to assigned shifts (= no-show signal)
    // Cheap heuristic: compare clockIn count to weeks elapsed * expected ~3 shifts/wk
    const weeksElapsed = Math.max(1, (Date.now() - +since60) / (7 * 86400_000));
    const expectedClocks = Math.min(15, weeksElapsed * 2);
    if (m.attendanceLogs.length < expectedClocks * 0.4 && expectedClocks >= 3) {
      factors.push({
        key: "low_attendance", label: "Sparse attendance",
        points: Math.round(Math.min(20, (1 - m.attendanceLogs.length / expectedClocks) * 25)),
        detail: `${m.attendanceLogs.length} clock-ins vs ~${Math.round(expectedClocks)} expected`,
      });
    }

    const rawScore = factors.reduce((a, f) => a + f.points, 0)
                   - positive.reduce((a, f) => a + f.points, 0);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const band: MemberRisk["band"] = score >= RISK_BANDS.high ? "high" : score >= RISK_BANDS.medium ? "medium" : "low";

    factors.sort((a, b) => b.points - a.points);
    positive.sort((a, b) => b.points - a.points);

    return {
      memberId: m.id,
      memberName: m.user.name,
      position: m.position,
      locationName: m.location?.name ?? null,
      score, band,
      topFactors:  factors.slice(0, 3),
      topPositive: positive.slice(0, 2),
    };
  }).sort((a, b) => b.score - a.score);
}

/** Convenience: just the at-risk members. */
export async function atRiskMembers(organizationId: string, minBand: "medium" | "high" = "medium") {
  const all = await scoreOrg(organizationId);
  const threshold = minBand === "high" ? RISK_BANDS.high : RISK_BANDS.medium;
  return all.filter(r => r.score >= threshold);
}
