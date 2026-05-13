import { redirect } from "next/navigation";
import Link from "next/link";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail, getActiveImpersonation } from "@/lib/platform/admin";
import { Logo, Wordmark } from "@/components/ui/logo";
import { LayoutDashboard, Building2, Users, FileText, Activity, ArrowLeft, LogOut } from "lucide-react";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const real = await getRealSessionUser();
  if (!real) redirect("/login");
  if (!isPlatformAdminEmail(real.email)) redirect("/dashboard");

  // If admin is currently impersonating, surface a banner — they probably want
  // to end impersonation before doing platform-admin work.
  const imp = await getActiveImpersonation();

  return (
    <div className="min-h-screen flex bg-ink-50/40 dark:bg-ink-950">
      <aside className="w-60 shrink-0 bg-white dark:bg-ink-900 border-r border-ink-200/80 dark:border-ink-800/80 hidden lg:flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5">
          <Link href="/platform" className="flex items-center gap-2.5">
            <Logo size="md" />
            <div>
              <Wordmark className="text-base block leading-none" />
              <div className="text-[10px] uppercase tracking-wider font-bold text-rose-500 mt-1">Platform admin</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <NavLink href="/platform"       icon={LayoutDashboard} label="Overview" />
          <NavLink href="/platform/orgs"  icon={Building2}        label="Organizations" />
          <NavLink href="/platform/users" icon={Users}            label="Users" />
          <NavLink href="/platform/audit" icon={FileText}         label="Audit log" />
          <NavLink href="/platform/health" icon={Activity}        label="System health" />
        </nav>

        <div className="p-3 border-t border-ink-100 dark:border-ink-800">
          <Link href="/dashboard" className="btn-ghost w-full text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to app
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {imp && (
          <div className="bg-rose-600 text-white px-6 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">⚠ You are impersonating a user</span>
              <span className="text-white/85">Started {Math.floor((Date.now() - +imp.startedAt) / 60_000)} min ago</span>
            </div>
            <form action="/api/platform/impersonate" method="post" className="contents">
              <button formMethod="DELETE" className="underline hover:no-underline">End impersonation</button>
            </form>
          </div>
        )}
        <header className="bg-white dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-ink-500 dark:text-ink-400">
            Signed in as <span className="font-semibold text-ink-900 dark:text-ink-100">{real.email}</span> · Platform admin
          </div>
          <Link href="/api/auth/signout" className="btn-ghost text-xs">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-ink-700 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-ink-800/70 hover:text-ink-900 dark:hover:text-ink-50 transition"
    >
      <Icon className="w-4 h-4 text-ink-400 dark:text-ink-500" />
      <span>{label}</span>
    </Link>
  );
}
