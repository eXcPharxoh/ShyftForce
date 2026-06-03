import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InlineSetupWizard } from "@/components/setup/inline-setup-wizard";

export const dynamic = "force-dynamic";

/**
 * Inline setup wizard — the place a new owner is sent to actually finish
 * setting up the workspace WITHOUT having to navigate to four separate
 * pages. Replaces the old "Getting Started" experience where each step
 * was just a link to /settings/locations, /hr/members, etc.
 *
 * Each step's form lives inside the wizard. The wizard hits the same
 * APIs each settings page would — just from one screen instead of four.
 * Once everything required is done, the wizard redirects to /dashboard.
 *
 * Returning users who somehow land here after setup is already complete
 * get bounced to the dashboard immediately so this isn't a dead-end.
 */
export default async function SetupPage() {
  const u = await requireUser();
  if (u.role !== "ADMIN" && u.role !== "MANAGER") redirect("/dashboard");

  const [locationCount, memberCount, shiftCount, locations] = await Promise.all([
    prisma.location.count({ where: { organizationId: u.organizationId } }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
    prisma.shift.count({ where: { location: { organizationId: u.organizationId } } }),
    prisma.location.findMany({
      where: { organizationId: u.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Already done? Bounce to dashboard so this isn't a stale screen.
  if (locationCount > 0 && memberCount > 1 && shiftCount > 0) {
    redirect("/dashboard");
  }

  return (
    <InlineSetupWizard
      orgName={u.organizationName}
      userName={u.name}
      hasLocation={locationCount > 0}
      hasTeam={memberCount > 1}
      hasShift={shiftCount > 0}
      locations={locations}
    />
  );
}
