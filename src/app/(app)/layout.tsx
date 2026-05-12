import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
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
        <Topbar name={u.name} role={u.role} image={u.image} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
