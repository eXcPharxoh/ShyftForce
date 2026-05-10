// EWA payout provider abstraction. The internal_ledger provider is the only one
// fully implemented — it just records the withdrawal as "pending" and lets the
// employer settle it manually (or on the next payroll run via the Finch
// integration, which can subtract this from net pay).
//
// Future providers (branch, tapcheck, dailypay, stripe_treasury) plug into the
// same interface and handle real money movement + their own KYC.

import { prisma } from "@/lib/prisma";

export type ProviderName = "internal_ledger" | "branch" | "tapcheck" | "dailypay" | "stripe_treasury";

export type WithdrawalRequest = {
  withdrawalId: string;
  organizationId: string;
  memberId: string;
  amountCents: number;
  feeCentsCharged: number;
  payoutMethod?: "ach" | "instant_debit" | "demo";
};

export type WithdrawalResult = {
  ok: boolean;
  newStatus: "pending" | "processing" | "settled" | "failed";
  externalRef?: string | null;
  failureReason?: string | null;
};

export interface EwaProvider {
  name: ProviderName;
  initiate(req: WithdrawalRequest): Promise<WithdrawalResult>;
  // Optional polling hook for providers with async settlement
  poll?(externalRef: string): Promise<WithdrawalResult>;
}

const internalLedger: EwaProvider = {
  name: "internal_ledger",
  async initiate(req) {
    // No external transfer — book it pending, mark for payroll deduction
    return { ok: true, newStatus: "pending", externalRef: `ledger:${req.withdrawalId}` };
  },
};

// Stub providers — return an explicit message until real keys are wired
function stubProvider(name: ProviderName, label: string): EwaProvider {
  return {
    name,
    async initiate() {
      return {
        ok: false,
        newStatus: "failed",
        failureReason: `${label} provider not configured. Set ${name.toUpperCase()}_API_KEY and implement initiate() in src/lib/ewa/provider.ts.`,
      };
    },
  };
}

const REGISTRY: Record<ProviderName, EwaProvider> = {
  internal_ledger: internalLedger,
  branch: stubProvider("branch", "Branch"),
  tapcheck: stubProvider("tapcheck", "Tapcheck"),
  dailypay: stubProvider("dailypay", "DailyPay"),
  stripe_treasury: stubProvider("stripe_treasury", "Stripe Treasury"),
};

export async function getProviderForOrg(organizationId: string): Promise<EwaProvider> {
  const settings = await prisma.ewaSettings.findUnique({ where: { organizationId } });
  const name = (settings?.providerName ?? "internal_ledger") as ProviderName;
  return REGISTRY[name] ?? internalLedger;
}
