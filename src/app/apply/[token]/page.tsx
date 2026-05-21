// Public, unauthenticated apply page. The publicToken on JobPosting is the slug.
// We render the posting + an application form. No login required — that's the
// whole point: a candidate gets a clean URL from a job board, applies in 60s.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/apply/apply-form";
import { Bolt } from "@/components/ui/logo";
import { Briefcase, MapPin, Clock, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await prisma.jobPosting.findFirst({
    where: { publicToken: token, status: "open" },
    include: {
      organization: { select: { name: true } },
      location:     { select: { name: true } },
    },
  });
  if (!p) notFound();

  const payLabel = formatPay(p.payMin, p.payMax, p.payPeriod);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <header className="border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-2">
          <Bolt size={20} />
          <span className="font-display font-medium text-[15px]">{p.organization.name}</span>
          <span className="ml-auto text-[11px] font-mono text-ink-500 uppercase tracking-[0.16em]">Now hiring</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <section className="mb-8">
          <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-brand-400 mb-2">
            {employmentLabel(p.employmentType)}
          </div>
          <h1 className="font-display text-[40px] leading-[1.05] font-medium tracking-tight-3">{p.title}</h1>

          <div className="flex items-center gap-4 flex-wrap mt-4 text-[13px] text-ink-300">
            {p.position && (
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-ink-500" /> {p.position}</span>
            )}
            {p.location?.name && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-ink-500" /> {p.location.name}</span>
            )}
            {payLabel && (
              <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-ink-500" /> {payLabel}</span>
            )}
            {p.startDate && (
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-ink-500" /> Starts {p.startDate.toISOString().slice(0, 10)}</span>
            )}
          </div>

          {p.description && (
            <div className="mt-6 text-[14.5px] text-ink-200 whitespace-pre-wrap leading-relaxed">
              {p.description}
            </div>
          )}
        </section>

        <ApplyForm token={p.publicToken} orgName={p.organization.name} />

        <footer className="mt-10 text-center text-[11px] text-ink-500">
          Powered by <span className="font-display text-ink-300">shyftforce</span> · This application goes directly to the {p.organization.name} hiring team.
        </footer>
      </main>
    </div>
  );
}

function employmentLabel(t: string) {
  switch (t) {
    case "full_time": return "Full-time";
    case "part_time": return "Part-time";
    case "contract":  return "Contract";
    case "seasonal":  return "Seasonal";
    default:          return t;
  }
}

function formatPay(min: number | null, max: number | null, period: string) {
  if (min == null && max == null) return null;
  const suffix = period === "year" ? "/yr" : period === "week" ? "/wk" : "/hr";
  if (min != null && max != null) return `$${min.toFixed(0)}–$${max.toFixed(0)}${suffix}`;
  if (min != null) return `From $${min.toFixed(0)}${suffix}`;
  return `Up to $${max!.toFixed(0)}${suffix}`;
}
