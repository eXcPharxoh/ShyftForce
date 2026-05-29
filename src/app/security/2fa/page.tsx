import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TwoFactorClient } from "@/components/settings/two-factor-client";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Forced TOTP enrollment landing — outside the (app) layout so the workspace's
 * require2fa redirect can't loop. Once the user enrolls, the layout's gate
 * stops firing and normal navigation resumes.
 */
export default async function ForcedTwoFactorPage() {
  const u = await requireUser();
  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: { totpEnabled: true },
  });
  // Already enrolled? Send them back to the app.
  if (me?.totpEnabled) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-xl">
        <header className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set up two-factor</h1>
          <p className="text-ink-400 mt-2 max-w-md mx-auto">
            Your workspace owner requires two-factor authentication. Enroll once and
            you&rsquo;re back in. Takes about 30 seconds.
          </p>
        </header>
        <section className="card p-5">
          <TwoFactorClient initialEnabled={false} email={u.email} />
        </section>
        <div className="text-center mt-4 text-[12px] text-ink-500">
          Already enrolled? <Link href="/dashboard" className="text-brand-300 underline">Go to the dashboard</Link>.
        </div>
      </div>
    </div>
  );
}
