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
  vertical:         "security" | "healthcare" | "restaurant" | "field_service" | "any";
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
