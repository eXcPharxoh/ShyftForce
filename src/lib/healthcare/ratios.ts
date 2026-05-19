// Patient-to-staff ratio enforcement. Given a proposed (member, unit, shift
// window), check whether assigning the member would violate any active ratio
// rule. The check counts concurrent staff on that unit during the window.
//
// California ratios (most-cited as a benchmark, codified in Title 22):
//   ICU / NICU / CCU         → 1 RN : 2 patients
//   Step-down / telemetry    → 1 RN : 4 patients
//   Med-surg                 → 1 RN : 5 patients
//   Emergency department     → 1 RN : 4 patients
//   Psychiatric              → 1 RN : 6 patients
//   Labor & delivery         → 1 RN : 2 patients
//   Post-anesthesia          → 1 RN : 2 patients
//
// We don't know the patient census in real time (it lives in the hospital's
// EHR). What we DO know is whether the org meets its OWN configured floor.
// So we treat the rule as: "for each X staff scheduled on unit Y, you can
// staff at most patientCount × X patients". The customer sets the rule;
// we enforce it operationally by warning if they schedule BELOW their
// stated floor for the unit + window.

import { prisma } from "@/lib/prisma";

export type RatioViolation = {
  ruleId:        string;
  unit:          string;
  role:          string;
  required:      number;     // staff needed for the patient load they've set
  scheduled:     number;     // staff currently scheduled on that unit + window
  message:       string;
};

/** Check if assigning `memberId` to a new/existing shift would violate ratios.
 *  Returns the list of triggered rules (empty = all good). Best-effort —
 *  caller decides whether to refuse the operation or just warn. */
export async function checkRatioForShift(opts: {
  organizationId: string;
  shiftId?:       string;   // existing shift being edited
  locationId:     string;
  unit:           string | null;
  startsAt:       Date;
  endsAt:         Date;
  memberRole:     string;   // "RN" | "LPN" | "CNA"
  /** Are we ADDING this member to the unit? false = removing (un-assign). */
  adding:         boolean;
  /** Anticipated patient census during the window. Default 0 = use whatever
   *  the customer has configured as the standing target. */
  patientCount?:  number;
}): Promise<RatioViolation[]> {
  if (!opts.unit) return []; // no unit configured on this shift; can't check

  const rules = await prisma.patientRatioRule.findMany({
    where: {
      organizationId: opts.organizationId,
      active: true,
      unit: opts.unit,
      role: opts.memberRole,
      OR: [{ locationId: null }, { locationId: opts.locationId }],
    },
  });
  if (rules.length === 0) return [];

  // Count CURRENT scheduled staff of this role on this unit + window
  const concurrent = await prisma.shift.findMany({
    where: {
      location: { organizationId: opts.organizationId },
      locationId: opts.locationId,
      unit: opts.unit,
      memberId: { not: null },
      status: { in: ["draft", "published"] },
      // Window overlap
      startsAt: { lt: opts.endsAt },
      endsAt:   { gt: opts.startsAt },
      // Filter for the role we care about
      member: { role: opts.memberRole as any },
      ...(opts.shiftId ? { id: { not: opts.shiftId } } : {}),
    },
    select: { id: true },
  });
  let scheduled = concurrent.length;
  if (opts.adding) scheduled += 1;
  else             scheduled -= 1;

  // Patient count: explicit override > customer's standing target (we treat
  // the rule's patientCount as "patients per staff" so a single rule means
  // staff floor = ceil(census / patientCount). If census isn't provided we
  // assume census = patientCount × scheduled — i.e. we're asking "do they
  // have enough staff for their own configured ratio at minimum?"
  const violations: RatioViolation[] = [];
  for (const r of rules) {
    const census = opts.patientCount ?? (r.patientCount * Math.max(1, scheduled));
    const required = Math.ceil(census / r.patientCount) * r.staffCount;
    if (scheduled < required) {
      violations.push({
        ruleId: r.id,
        unit: r.unit,
        role: r.role,
        required, scheduled,
        message: `${opts.unit} requires ${r.staffCount} ${r.role} per ${r.patientCount} patients. ` +
                 `With ${scheduled} ${r.role}${scheduled === 1 ? "" : "s"} scheduled (after this change), ` +
                 `you'd need ${required} for the assumed census of ${census}.`,
      });
    }
  }
  return violations;
}
