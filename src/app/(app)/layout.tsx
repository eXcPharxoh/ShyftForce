import { requireUser, getRealSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { TrialBanner } from "@/components/trial-banner";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { isTrialActive } from "@/lib/stripe";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const real = await getRealSessionUser();
  const showPlatformAdmin = isPlatformAdminEmail(real?.email);
  const [pendingOffers, org] = await Promise.all([
    prisma.openShiftOffer.count({
      where: { memberId: u.memberId, status: "pending", expiresAt: { gt: new Date() } },
    }),
    prisma.organization.findUnique({
      where: { id: u.organizationId },
      select: { trialEndsAt: true },
    }),
  ]);

  // Trial banner shows for everyone (it's the customer-facing flag that the
  // org's on the open-beta trial). Hide it once the trial expires.
  const onTrial = isTrialActive(org);
  const daysLeft = onTrial && org?.trialEndsAt
    ? Math.max(0, Math.ceil((+org.trialEndsAt - Date.now()) / 86400000))
    : 0;

  return (
    <div className="min-h-screen flex">
      <Sidebar
        orgName={u.organizationName}
        industry={u.organizationIndustry}
        role={u.role}
        pendingOffers={pendingOffers}
      />
      <div className="flex-1 min-w-0">
        {u.impersonatedByEmail && (
          <ImpersonationBanner adminEmail={u.impersonatedByEmail} targetName={u.name} targetEmail={u.email} />
        )}
        {onTrial && <TrialBanner daysLeft={daysLeft} />}
        <Topbar name={u.name} role={u.role} image={u.image} showPlatformAdmin={showPlatformAdmin} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
