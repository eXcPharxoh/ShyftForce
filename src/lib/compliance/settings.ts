import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, type ComplianceSettings as Settings } from "./engine";

export async function getOrCreateComplianceSettings(organizationId: string): Promise<Settings> {
  const found = await prisma.complianceSettings.findUnique({ where: { organizationId } });
  if (found) return found as Settings;
  const created = await prisma.complianceSettings.create({
    data: { organizationId, ...DEFAULT_SETTINGS },
  });
  return created as Settings;
}
