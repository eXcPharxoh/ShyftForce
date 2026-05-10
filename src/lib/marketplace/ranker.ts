// Pure candidate ranker for the open-shift marketplace + Co-pilot replacement tool.
// Deterministic scoring 0–100 with explainable reasons per candidate.

export type ShiftLite = {
  id: string;
  locationId: string;
  position: string | null;
  startsAt: Date;
  endsAt: Date;
};

export type CandidateInput = {
  id: string;
  name: string;
  position: string | null;
  locationId: string | null;
  hourlyRate: number | null;
  shiftsThisWeek: { id: string; startsAt: Date; endsAt: Date }[];
  approvedTimeOff: { startsOn: Date; endsOn: Date }[];
  alreadyOffered?: boolean;
};

export type RankedCandidate = {
  id: string;
  name: string;
  position: string | null;
  locationId: string | null;
  score: number;
  weeklyHoursCurrent: number;
  reasons: string[];
  conflict: string | null;          // if set, candidate is excluded
  rationale: string;                // 1-line summary for messages
};

export type RankerOptions = {
  shift: ShiftLite;
  candidates: CandidateInput[];
  excludeMemberIds?: string[];
  maxWeeklyHours?: number; // default 40
};

export function rankCandidates(opts: RankerOptions): RankedCandidate[] {
  const { shift, candidates, excludeMemberIds = [], maxWeeklyHours = 40 } = opts;
  const shiftHours = (+shift.endsAt - +shift.startsAt) / 3600000;
  const exclude = new Set(excludeMemberIds);

  return candidates
    .filter(c => !exclude.has(c.id))
    .map(c => {
      const reasons: string[] = [];
      let score = 50;

      // Conflict — overlapping shift = disqualify
      const overlapping = c.shiftsThisWeek.find(s => s.startsAt < shift.endsAt && s.endsAt > shift.startsAt);
      if (overlapping) {
        return mkRanked(c, -1, [], "Has overlapping shift", "Already booked at the same time");
      }

      // Conflict — approved time off
      const off = c.approvedTimeOff.find(t => t.startsOn <= shift.endsAt && t.endsOn >= shift.startsAt);
      if (off) {
        return mkRanked(c, -1, [], "On approved time off", "Approved time off covers this shift");
      }

      // Same location preference
      if (c.locationId === shift.locationId) {
        score += 25; reasons.push("Same location");
      } else if (c.locationId) {
        reasons.push("Different home location");
      }

      // Position match
      if (c.position && shift.position && c.position === shift.position) {
        score += 15; reasons.push("Position match");
      }

      // Weekly workload
      const totalH = c.shiftsThisWeek.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0);
      const projected = totalH + shiftHours;
      if (projected > maxWeeklyHours) {
        // strong penalty if it'd push over OT
        const overBy = projected - maxWeeklyHours;
        score -= Math.min(40, overBy * 5);
        reasons.push(`Would push to ${projected.toFixed(0)}h (over ${maxWeeklyHours}h limit)`);
      } else if (totalH < 20) {
        score += 10; reasons.push(`Light week (${totalH.toFixed(0)}h)`);
      } else if (totalH < 30) {
        score += 5;  reasons.push(`Moderate (${totalH.toFixed(0)}h)`);
      } else {
        reasons.push(`Already at ${totalH.toFixed(0)}h`);
      }

      // Already-offered penalty (still eligible, just lower)
      if (c.alreadyOffered) {
        score -= 5; reasons.push("Already offered earlier");
      }

      return mkRanked(c, Math.max(0, Math.min(100, score)), reasons, null, summarize(reasons));
    })
    .filter(r => r.score >= 0)
    .sort((a, b) => b.score - a.score);
}

function mkRanked(c: CandidateInput, score: number, reasons: string[], conflict: string | null, rationale: string): RankedCandidate {
  return {
    id: c.id, name: c.name, position: c.position, locationId: c.locationId,
    score,
    weeklyHoursCurrent: c.shiftsThisWeek.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0),
    reasons, conflict, rationale,
  };
}

function summarize(reasons: string[]): string {
  if (reasons.length === 0) return "Eligible";
  return reasons.slice(0, 2).join(" · ");
}

// ---------- Wave plan ----------
export type WavePlan = { wave: 1 | 2 | 3; size: number; expiryHours: number; description: string };
export const WAVES: Record<1 | 2 | 3, WavePlan> = {
  1: { wave: 1, size: 3, expiryHours: 1,    description: "Top 3 best fits" },
  2: { wave: 2, size: 5, expiryHours: 2,    description: "Broaden to next 5" },
  3: { wave: 3, size: 99, expiryHours: 24,  description: "All eligible candidates" },
};
