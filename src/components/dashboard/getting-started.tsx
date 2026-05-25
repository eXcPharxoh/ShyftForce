import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, Circle, MapPin, Users, CalendarPlus, Plug, ArrowRight, Rocket } from "lucide-react";

/**
 * Getting-Started checklist — shown on the dashboard to owners/managers while
 * their workspace is still being set up. A new org starts with just the owner
 * (no locations, no team, no shifts), so this guides them to a working schedule
 * in three steps. It returns null once the required steps are done, so it
 * quietly disappears — no dismiss state needed.
 */
type Step = {
  key: string;
  label: string;
  blurb: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  required: boolean;
};

export async function GettingStarted({ orgId, role }: { orgId: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE" }) {
  if (role !== "ADMIN" && role !== "MANAGER") return null;

  const now = new Date();
  const [locationCount, memberCount, inviteCount, shiftCount, org] = await Promise.all([
    prisma.location.count({ where: { organizationId: orgId } }),
    prisma.member.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.invitation.count({ where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: now } } }),
    prisma.shift.count({ where: { location: { organizationId: orgId } } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { finchConnectedAt: true } }),
  ]);

  const steps: Step[] = [
    {
      key: "location",
      label: "Add your first location",
      blurb: "A site or branch your team clocks in at.",
      href: "/settings/locations",
      icon: MapPin,
      done: locationCount > 0,
      required: true,
    },
    {
      key: "team",
      label: "Invite your team",
      blurb: "Send invites so people can see their schedule.",
      href: "/hr/members",
      icon: Users,
      done: memberCount > 1 || inviteCount > 0,
      required: true,
    },
    {
      key: "schedule",
      label: "Create your first shift",
      blurb: "Drop a shift on the calendar to get rolling.",
      href: "/schedule",
      icon: CalendarPlus,
      done: shiftCount > 0,
      required: true,
    },
    {
      key: "payroll",
      label: "Connect payroll",
      blurb: "Optional — push approved hours to ADP, Gusto & more.",
      href: "/settings/integrations",
      icon: Plug,
      done: !!org?.finchConnectedAt,
      required: false,
    },
  ];

  const required = steps.filter((s) => s.required);
  const requiredDone = required.filter((s) => s.done).length;
  // Once every required step is done, the workspace is set up — hide the card.
  if (requiredDone >= required.length) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden border-brand-500/25">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 bg-brand-500/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
          <Rocket className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-ink-50">Finish setting up your workspace</h2>
          <p className="text-[12px] text-ink-400">{requiredDone} of {required.length} done · a few minutes to a live schedule.</p>
        </div>
        {/* Progress pips */}
        <div className="hidden sm:flex items-center gap-1.5">
          {required.map((s) => (
            <span key={s.key} className={`h-1.5 w-8 rounded-full ${s.done ? "bg-brand-400" : "bg-white/[0.12]"}`} />
          ))}
        </div>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {steps.map((s) => {
          const Icon = s.icon;
          const isNext = nextStep?.key === s.key;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${s.done ? "opacity-60" : "hover:bg-white/[0.03]"}`}
              >
                {s.done
                  ? <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                  : <Circle className="w-5 h-5 text-ink-600 shrink-0" />}
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] text-ink-300 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13.5px] font-medium ${s.done ? "line-through text-ink-400" : "text-ink-50"}`}>
                    {s.label}
                    {!s.required && <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold no-underline">Optional</span>}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">{s.blurb}</div>
                </div>
                {!s.done && (
                  <span className={`inline-flex items-center gap-1 text-[12px] font-medium shrink-0 ${isNext ? "text-brand-300" : "text-ink-400"}`}>
                    {isNext ? "Start" : "Open"} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
