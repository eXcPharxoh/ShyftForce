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
function stubProvider(name: ProviderName, label: string, signupUrl?: string): EwaProvider {
  return {
    name,
    async initiate() {
      return {
        ok: false,
        newStatus: "failed",
        failureReason: `${label} provider not yet configured. ${signupUrl ? `Sign up at ${signupUrl} and set ` : "Set "}${name.toUpperCase()}_API_KEY + ${name.toUpperCase()}_WEBHOOK_SECRET in env.`,
      };
    },
  };
}

/**
 * Branch is our reference EWA partner per the design handoff open question
 * (vs Wagestream / Atomic). Reasoning:
 *  - Native instant-payout to debit cards (no API for ACH delay)
 *  - Already powers EWA for Walmart, Uber, Lyft contractor pay
 *  - Public REST API with sandbox: https://branchapp.com/developers
 *  - No bank/charter required — operates as a money transmitter
 *  - Fee model: per-withdrawal flat $2.99 (or employer-subsidized free)
 *
 * When you sign up at https://branchapp.com/developers:
 *   1. Set BRANCH_API_KEY  + BRANCH_WEBHOOK_SECRET in your .env
 *   2. Implement the real Branch HTTP calls in `branchProvider.initiate()`
 *   3. Wire /api/ewa/webhooks/branch to receive settlement events
 *
 * Until then the provider returns a friendly "not configured" message so the
 * EWA settings UI can clearly show the integration status.
 */
async function branchInitiate(req: WithdrawalRequest): Promise<WithdrawalResult> {
  const apiKey = process.env.BRANCH_API_KEY;
  if (!apiKey) {
    return {
      ok: false, newStatus: "failed",
      failureReason: "Branch is selected as your EWA partner but BRANCH_API_KEY is not set. Add it to .env (or use the internal_ledger provider until you sign up).",
    };
  }
  // Live implementation goes here. Sketch:
  //   POST https://api.branchapp.com/v1/payouts
  //     { amount: req.amountCents, employee_id: req.memberId, ... }
  //   → returns { id, status: "pending" | "succeeded" | "failed", ... }
  return {
    ok: false, newStatus: "failed",
    failureReason: "Branch live integration not implemented yet — only env-var check is wired.",
  };
}

const REGISTRY: Record<ProviderName, EwaProvider> = {
  internal_ledger: internalLedger,
  branch: { name: "branch", initiate: branchInitiate },
  tapcheck: stubProvider("tapcheck", "Tapcheck", "https://tapcheck.com/business"),
  dailypay: stubProvider("dailypay", "DailyPay", "https://www.dailypay.com/business"),
  stripe_treasury: stubProvider("stripe_treasury", "Stripe Treasury", "https://stripe.com/treasury"),
};

export async function getProviderForOrg(organizationId: string): Promise<EwaProvider> {
  const settings = await prisma.ewaSettings.findUnique({ where: { organizationId } });
  const name = (settings?.providerName ?? "internal_ledger") as ProviderName;
  return REGISTRY[name] ?? internalLedger;
}
