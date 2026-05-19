// Pre-configured permit categories per vertical. The catalog drives:
//   - the dropdown in the New Permit dialog (with sensible defaults)
//   - the regulator + renewal URL hints
//   - the "agency_license" vs "member-level" distinction
//   - which vertical surfaces this in their dashboard

export type PermitCategory = {
  key:              string;
  label:            string;
  level:            "agency" | "member";
  description:      string;
  vertical:         "security" | "healthcare" | "restaurant" | "field_service" | "construction" | "hospitality" | "education" | "any";
  defaultFeeCents?: number;
  // Optional pre-filled regulator hint by region. Customer overrides on create.
  hintRegulator?:   string;
  hintRenewalUrl?:  string;
};

export const PERMIT_CATALOG: PermitCategory[] = [
  // ---------------- Security ----------------
  {
    key: "agency_license",
    label: "Security agency licence",
    level: "agency",
    description: "Annual operating licence for the security agency itself. Without it, no contract is legal.",
    vertical: "security",
    defaultFeeCents: 200_000, // ~$2,000 placeholder
    hintRegulator: "Bureau de la sécurité privée (QC)",
    hintRenewalUrl: "https://www.bspquebec.ca/",
  },
  {
    key: "guard_license",
    label: "Security guard permit",
    level: "member",
    description: "Each guard needs a current permit to legally work a shift. Annual renewal.",
    vertical: "security",
    defaultFeeCents: 18_200, // ~$182 QC
    hintRegulator: "Bureau de la sécurité privée (QC)",
    hintRenewalUrl: "https://www.bspquebec.ca/",
  },
  {
    key: "firearm",
    label: "Firearm permit (PAL/ATF)",
    level: "member",
    description: "Required for armed guards. Often separate from base guard licence.",
    vertical: "security",
    defaultFeeCents: 8_000,
    hintRegulator: "RCMP Canadian Firearms Program / ATF",
  },

  // ---------------- Healthcare ----------------
  {
    key: "rn_license",
    label: "Registered Nurse licence",
    level: "member",
    description: "Active RN licence with the state/provincial nursing board. Required to clock in.",
    vertical: "healthcare",
  },
  {
    key: "lpn_license",
    label: "Licensed Practical Nurse licence",
    level: "member",
    description: "Active LPN/LVN licence. Required to clock in.",
    vertical: "healthcare",
  },
  {
    key: "cpr",
    label: "CPR / First Aid certification",
    level: "member",
    description: "Typically 2-year cycle. Required for many healthcare + childcare roles.",
    vertical: "healthcare",
  },
  {
    key: "nursing_ceus",
    label: "Continuing Education hours (CEUs)",
    level: "member",
    description: "Most state boards require 20–30 CEUs per renewal cycle. Track expiry per cycle.",
    vertical: "healthcare",
  },
  {
    key: "immunization_flu",
    label: "Flu vaccination",
    level: "member",
    description: "Annual flu shot required by many healthcare employers + insurers.",
    vertical: "healthcare",
  },
  {
    key: "immunization_tb",
    label: "TB test",
    level: "member",
    description: "Annual or biennial TB clearance required for direct-patient roles.",
    vertical: "healthcare",
  },
  {
    key: "hipaa_training",
    label: "HIPAA training",
    level: "member",
    description: "Annual HIPAA refresher required for anyone with PHI access.",
    vertical: "healthcare",
  },
  {
    key: "background_check",
    label: "Background check",
    level: "member",
    description: "Many states require background check renewal every 2-3 years for healthcare workers.",
    vertical: "healthcare",
  },
  {
    key: "drug_test",
    label: "Drug test clearance",
    level: "member",
    description: "Pre-employment + periodic random testing. Track the most recent clearance.",
    vertical: "healthcare",
  },

  // ---------------- Restaurant / hospitality ----------------
  {
    key: "food_handler",
    label: "Food handler permit",
    level: "member",
    description: "Local health-department certification for kitchen + service staff.",
    vertical: "restaurant",
    defaultFeeCents: 1_500,
  },
  {
    key: "alcohol_service",
    label: "Alcohol service permit (TIPS/ServSafe)",
    level: "member",
    description: "Required for anyone who serves or pours alcohol.",
    vertical: "restaurant",
    defaultFeeCents: 4_000,
  },

  // ---------------- Field service / transport ----------------
  {
    key: "cdl",
    label: "Commercial Driver's Licence (CDL)",
    level: "member",
    description: "Annual or biennial renewal depending on jurisdiction.",
    vertical: "field_service",
  },
  {
    key: "osha_30",
    label: "OSHA-30 construction safety",
    level: "member",
    description: "3- or 5-year cycle. Required on most commercial sites.",
    vertical: "field_service",
  },

  // ---------------- Construction ----------------
  {
    key: "osha_10",
    label: "OSHA-10 construction safety",
    level: "member",
    description: "Entry-level construction safety training. 5-year cycle.",
    vertical: "construction",
    defaultFeeCents: 4_900,
  },
  {
    key: "osha_30_construction",
    label: "OSHA-30 (Construction)",
    level: "member",
    description: "Required for foremen and supervisors. 5-year cycle.",
    vertical: "construction",
    defaultFeeCents: 18_900,
  },
  {
    key: "scaffolding_competent_person",
    label: "Competent Person — Scaffolding",
    level: "member",
    description: "OSHA requires a qualified competent person on-site whenever scaffolding is erected/dismantled.",
    vertical: "construction",
  },
  {
    key: "fall_protection",
    label: "Fall protection certification",
    level: "member",
    description: "Required for any work at heights >6ft on construction sites.",
    vertical: "construction",
  },
  {
    key: "first_aid_cpr_construction",
    label: "First Aid / CPR (job-site)",
    level: "member",
    description: "OSHA-compliant first-aid + CPR. Required for any crew without nearby medical access (<4 min).",
    vertical: "construction",
  },
  {
    key: "forklift_operator",
    label: "Forklift operator certification",
    level: "member",
    description: "OSHA 1910.178 — required for anyone operating a powered industrial truck. 3-year cycle.",
    vertical: "construction",
  },

  // ---------------- Hospitality / Hotel ----------------
  {
    key: "servsafe_manager",
    label: "ServSafe Manager certification",
    level: "member",
    description: "Required certification for the person-in-charge in most US states. 5-year cycle.",
    vertical: "hospitality",
    defaultFeeCents: 17_900,
  },
  {
    key: "tips_certification",
    label: "TIPS alcohol certification",
    level: "member",
    description: "Required for bartenders + servers in many jurisdictions. 3-year cycle.",
    vertical: "hospitality",
    defaultFeeCents: 4_000,
  },
  {
    key: "pool_operator",
    label: "Certified Pool/Spa Operator (CPO)",
    level: "member",
    description: "Required for resort pool maintenance staff. 5-year cycle.",
    vertical: "hospitality",
    defaultFeeCents: 35_000,
  },
  {
    key: "hotel_business_license",
    label: "Hotel/lodging business licence",
    level: "agency",
    description: "City/county lodging licence — annual renewal.",
    vertical: "hospitality",
    defaultFeeCents: 50_000,
  },

  // ---------------- Education ----------------
  {
    key: "teaching_license",
    label: "Teaching certification",
    level: "member",
    description: "State teaching licence. Typically 5-year renewal cycle with CEU requirements.",
    vertical: "education",
  },
  {
    key: "substitute_certification",
    label: "Substitute teacher certification",
    level: "member",
    description: "State or district sub permit. 1-3 year cycle depending on state.",
    vertical: "education",
  },
  {
    key: "fbi_background_check",
    label: "FBI/state background check",
    level: "member",
    description: "Required for all school employees. Most states require 5-year renewal.",
    vertical: "education",
  },
  {
    key: "mandated_reporter_training",
    label: "Mandated reporter training",
    level: "member",
    description: "Annual child-abuse reporting training. Required by most state ed boards.",
    vertical: "education",
  },
  {
    key: "cpr_school",
    label: "CPR / First Aid (school)",
    level: "member",
    description: "Required for nurses, coaches, PE teachers. 2-year cycle.",
    vertical: "education",
  },
  {
    key: "bus_driver_cdl",
    label: "School bus CDL (Class B + S endorsement)",
    level: "member",
    description: "Required for school bus drivers. Annual physical + 5-year licence renewal.",
    vertical: "education",
  },

  // ---------------- Cross-vertical escape hatch ----------------
  {
    key: "custom",
    label: "Custom permit / licence",
    level: "member",
    description: "Anything not on the list — name it yourself.",
    vertical: "any",
  },
];

export function permitCategory(key: string): PermitCategory | null {
  return PERMIT_CATALOG.find(c => c.key === key) ?? null;
}

export function permitLabel(p: { category: string; customLabel: string | null }): string {
  if (p.category === "custom") return p.customLabel ?? "Custom permit";
  return permitCategory(p.category)?.label ?? p.category;
}

/** Reminder cadence in days BEFORE expiry. Order matters — daily cron fires
 *  in this order and only one reminder per day per permit. */
export const REMINDER_DAYS = [60, 30, 14, 7, 0] as const;
