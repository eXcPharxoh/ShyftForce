import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EmployeeWizard } from "@/components/onboarding/employee-wizard";

export const dynamic = "force-dynamic";

/**
 * Standalone welcome / first-time-employee wizard. Lives OUTSIDE the (app)
 * layout so the layout's "redirect EMPLOYEEs to /welcome until onboarded" logic
 * doesn't loop. Employees who've already finished are bounced to /schedule.
 */
export default async function WelcomePage() {
  const u = await requireUser();
  const [member, org] = await Promise.all([
    prisma.member.findUnique({
      where: { id: u.memberId },
      select: { onboardingAt: true },
    }),
    prisma.organization.findUnique({
      where: { id: u.organizationId },
      select: { name: true, faceVerification: true },
    }),
  ]);
  if (member?.onboardingAt) redirect("/schedule");

  const faceMode = ((org?.faceVerification as "off" | "flag" | "block" | undefined) ?? "off");

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 px-4 py-10">
      <EmployeeWizard
        orgName={org?.name ?? "your team"}
        userName={u.name}
        faceMode={faceMode}
      />
    </div>
  );
}
