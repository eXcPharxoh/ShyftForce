// Public parent-facing conference booking page. Auth-free — only needs
// the teacher's member ID (which acts as the share token). Parents
// click an open slot and book without creating an account.
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Logo, Wordmark } from "@/components/ui/logo";
import { PublicConferenceClient } from "@/components/education/public-conference-client";

export const dynamic = "force-dynamic";

export default async function PublicConferenceBookingPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;

  const teacher = await prisma.member.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { name: true, email: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!teacher || teacher.status !== "active") notFound();

  // Pull only future, unbooked slots
  const slots = await prisma.conferenceSlot.findMany({
    where: {
      teacherMemberId: teacherId,
      startsAt: { gte: new Date() },
      bookings: { none: {} },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-ink-50 dark:bg-ink-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size="md" /><Wordmark className="text-base" />
        </div>

        <header className="text-center mb-8">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-600 dark:text-brand-400 mb-1">
            {teacher.organization.name}
          </div>
          <h1 className="text-3xl font-bold tracking-tight-2">
            Book a conference with {teacher.user.name}
          </h1>
          <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
            Pick a time below. Your booking is confirmed instantly — no account required.
          </p>
        </header>

        <PublicConferenceClient
          teacherId={teacherId}
          teacherName={teacher.user.name}
          slots={slots.map(s => ({
            id: s.id,
            startsAt: s.startsAt.toISOString(),
            endsAt:   s.endsAt.toISOString(),
            notes:    s.notes,
          }))}
        />

        <footer className="mt-12 text-center text-[11px] text-ink-500">
          Powered by <a href="/" className="hover:text-brand-600">ShyftForce</a>
        </footer>
      </div>
    </main>
  );
}
