import { redirect } from "next/navigation";
import { requireUser, getRealSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { TrialBanner } from "@/components/trial-banner";
import { TrialExpiredGate } from "@/components/trial-expired-gate";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { isTrialActive } from "@/lib/stripe";
import { initials } from "@/lib/utils";
import { LocaleProvider } from "@/lib/i18n/provider";
import { resolveLocale } from "@/lib/i18n/dictionaries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const real = await getRealSessionUser();
  const showPlatformAdmin = isPlatformAdminEmail(real?.email);

  const [pendingOffers, org, activeMembers, member] = await Promise.all([
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
        defaultLocale: true,
        suspendedAt: true,
        suspendedReason: true,
        require2fa: true,
        requireEmailVerified: true,
      },
    }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
    u.memberId
      ? prisma.member.findUnique({ where: { id: u.memberId }, select: { locale: true, onboardingAt: true } })
      : Promise.resolve(null),
  ]);

  // First-time employee → guided welcome wizard. Managers/admins skip this
  // (they have the workspace wizard at /onboarding). Platform admins also skip.
  if (u.role === "EMPLOYEE" && member && !member.onboardingAt && !showPlatformAdmin) {
    redirect("/welcome");
  }

  // Workspace-enforced security policies. Platform admins are exempt so they
  // can still operate even on workspaces with strict toggles on.
  const meUser = !showPlatformAdmin && u.memberId
    ? await prisma.user.findUnique({
        where: { id: u.id },
        select: { totpEnabled: true, emailVerified: true },
      })
    : null;
  if (!showPlatformAdmin && meUser) {
    if (org?.require2fa && !meUser.totpEnabled) {
      redirect("/security/2fa");
    }
    if (org?.requireEmailVerified && !meUser.emailVerified) {
      redirect("/verify-email?required=1");
    }
  }
  // Soft reminder for unverified emails when the workspace doesn't hard-require.
  const showVerifyEmailBanner = !showPlatformAdmin && meUser && !meUser.emailVerified && !org?.requireEmailVerified;

  // Resolve effective locale: member preference → org default → "en"
  const locale = resolveLocale(member?.locale, org?.defaultLocale);

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

  // Suspension is now enforced in requireUser() (redirects to /suspended for
  // pages + API), so no overlay is needed here.

  return (
    <LocaleProvider locale={locale}>
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
        {showVerifyEmailBanner && <VerifyEmailBanner email={u.email} />}
        <Topbar name={u.name} role={u.role} image={u.image} showPlatformAdmin={showPlatformAdmin} />
        {/* pb-24 on mobile keeps content clear of the bottom nav; lg restores normal spacing. */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-7 pb-24 lg:pb-7 max-w-[1480px] w-full mx-auto">
          {children}
        </main>
        {/* Mobile-only primary navigation (sidebar is hidden < lg). */}
        <BottomNav pendingOffers={pendingOffers} />
      </div>

      {/* Trial-expired hard gate (managers only) — full-screen modal blocks
          the workspace until they subscribe or contact sales. */}
      {showGate && (
        <TrialExpiredGate daysExpired={daysExpired} activeMembers={activeMembers} />
      )}
    </div>
    </LocaleProvider>
  );
}
