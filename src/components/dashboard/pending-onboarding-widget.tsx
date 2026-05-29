import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UserPlus, Clock } from "lucide-react";
import { relTime } from "@/lib/utils";

/**
 * Manager-side nudge: "X employees haven't finished their welcome wizard."
 * Renders nothing when everyone's onboarded — like the GettingStarted card,
 * it quietly disappears once the work is done.
 */
export async function PendingOnboardingWidget({ orgId }: { orgId: string }) {
  const pending = await prisma.member.findMany({
    where: {
      organizationId: orgId,
      status: "active",
      role: "EMPLOYEE",
      onboardingAt: null,
      // Surface freshly-invited people sooner than ones who've been ignoring it.
    },
    select: {
      id: true,
      hireDate: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { hireDate: "desc" },
    take: 8,
  });

  if (pending.length === 0) return null;

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold">
          {pending.length} teammate{pending.length === 1 ? "" : "s"} haven&rsquo;t finished setup
        </h3>
      </div>
      <p className="text-[12px] text-ink-400 mb-3">
        They haven&rsquo;t opened the welcome wizard — auto-scheduling can&rsquo;t use their availability and they won&rsquo;t get shift SMS until they do.
      </p>
      <ul className="space-y-1.5">
        {pending.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 text-[12.5px] rounded-md bg-white/[0.03] px-3 py-2">
            <div className="min-w-0">
              <div className="text-ink-100 truncate font-medium">{m.user.name}</div>
              <div className="text-[11px] text-ink-500 truncate">{m.user.email}</div>
            </div>
            <div className="text-[11px] text-ink-500 flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> Invited {relTime(m.hireDate)}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/hr/members" className="text-[12px] text-brand-300 inline-flex items-center mt-3">
        Manage team →
      </Link>
    </section>
  );
}
