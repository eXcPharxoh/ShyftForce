import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  return (
    <div className="min-h-screen flex">
      <Sidebar orgName={u.organizationName} />
      <div className="flex-1 min-w-0">
        <Topbar name={u.name} role={u.role} image={u.image} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
