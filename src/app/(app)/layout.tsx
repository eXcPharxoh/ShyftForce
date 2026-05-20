import { requireUser, getRealSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { TrialBanner } from "@/components/trial-banner";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { isTrialActive } from "@/lib/stripe";
import { initials } from "@/lib/utils";

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
    <div className="min-h-screen flex bg-ink-950 text-ink-50">
      <Sidebar
        orgName={u.organizationName}
        industry={u.organizationIndustry}
        role={u.role}
        pendingOffers={pendingOffers}
        userName={u.name}
        userInitials={initials(u.name)}
        userRole={u.role}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        {u.impersonatedByEmail && (
          <ImpersonationBanner adminEmail={u.impersonatedByEmail} targetName={u.name} targetEmail={u.email} />
        )}
        {onTrial && <TrialBanner daysLeft={daysLeft} />}
        <Topbar name={u.name} role={u.role} image={u.image} showPlatformAdmin={showPlatformAdmin} />
        <main className="flex-1 px-8 py-7 max-w-[1480px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
