import { prisma } from "@/lib/prisma";

export const DEFAULT_EWA = {
  enabled: false,
  earnedRatePercent: 50,
  feeCentsPerWithdrawal: 199,
  minWithdrawalCents: 2000,
  maxPerPayPeriodCents: 50_000,
  providerName: "internal_ledger",
} as const;

export async function getOrCreateEwaSettings(organizationId: string) {
  const found = await prisma.ewaSettings.findUnique({ where: { organizationId } });
  if (found) return found;
  return await prisma.ewaSettings.create({ data: { organizationId, ...DEFAULT_EWA } });
}
