import { requireUser, getRealSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { TrialBanner } from "@/components/trial-banner";
import { TrialExpiredGate } from "@/components/trial-expired-gate";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { isTrialActive } from "@/lib/stripe";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const real = await getRealSessionUser();
  const showPlatformAdmin = isPlatformAdminEmail(real?.email);

  const [pendingOffers, org, activeMembers] = await Promise.all([
    prisma.openShiftOffer.count({
      where: { memberId: u.memberId, status: "pending", expiresAt: { gt: new Date() } },
    }),
    prisma.organization.findUnique({
      where: { id: u.organizationId },
      select: {
        trialEndsAt: true,
        plan: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
  ]);

  // Trial state
  const onTrial = isTrialActive(org);
  const daysLeft = onTrial && org?.trialEndsAt
    ? Math.max(0, Math.ceil((+org.trialEndsAt - Date.now()) / 86400000))
    : 0;

  // Trial-expired gate logic:
  //   - Trial has ended (trialEndsAt is in the past)
  //   - AND no active Stripe subscription
  //   - AND user is a manager/admin (employees see a softer "ask your manager" view)
  //   - Platform admins are exempt (they can still access the workspace)
  const trialExpired = !!org?.trialEndsAt && org.trialEndsAt < new Date();
  const noActiveSub  = !org?.stripeSubscriptionId || !["active", "trialing"].includes(org?.subscriptionStatus ?? "");
  const showGate     = trialExpired && noActiveSub && (u.role === "ADMIN" || u.role === "MANAGER") && !showPlatformAdmin;
  const daysExpired  = org?.trialEndsAt ? Math.max(0, Math.floor((Date.now() - +org.trialEndsAt) / 86400000)) : 0;

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

      {/* Trial-expired hard gate (managers only) — full-screen modal blocks
          the workspace until they subscribe or contact sales. */}
      {showGate && (
        <TrialExpiredGate daysExpired={daysExpired} activeMembers={activeMembers} />
      )}
    </div>
  );
}
