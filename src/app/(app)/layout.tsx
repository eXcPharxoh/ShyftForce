import { requireUser, getRealSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { isPlatformAdminEmail } from "@/lib/platform/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const real = await getRealSessionUser();
  const showPlatformAdmin = isPlatformAdminEmail(real?.email);
  const pendingOffers = await prisma.openShiftOffer.count({
    where: { memberId: u.memberId, status: "pending", expiresAt: { gt: new Date() } },
  });
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
        <Topbar name={u.name} role={u.role} image={u.image} showPlatformAdmin={showPlatformAdmin} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
