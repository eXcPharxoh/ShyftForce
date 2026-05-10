import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const u = await requireUser();
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  return <OnboardingWizard orgName={org?.name ?? ""} userName={u.name} />;
}
