// Public-ish claim page. Auth still required (sub must log in) — the
// token only routes them to the right callout. No leak if sub forwards
// the link because logged-out users see the login page first.
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { claimByToken } from "@/lib/education/sub-callout";
import { Logo, Wordmark } from "@/components/ui/logo";
import { CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SubCalloutClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const u = await getSessionUser();
  if (!u) {
    // Stash the intended destination + bounce to login
    redirect(`/login?next=${encodeURIComponent(`/sub-callout/claim/${token}`)}`);
  }

  const result = await claimByToken(token);

  return (
    <main className="min-h-screen bg-ink-50 dark:bg-ink-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size="md" /><Wordmark className="text-base" />
        </div>

        {result.ok && result.shift ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You got it!</h1>
            <p className="text-ink-700 dark:text-ink-300 mb-4">
              The shift is yours. The school office has been notified.
            </p>
            <div className="card p-4 text-left text-sm mb-4 bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30">
              <div className="font-semibold">{result.shift.locationName}</div>
              <div className="text-ink-700 dark:text-ink-300">
                {result.shift.startsAt.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {" – "}
                {result.shift.endsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            <Link href="/dashboard" className="btn-primary inline-flex">Go to dashboard →</Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{result.error ?? "Not available"}</h1>
            <p className="text-ink-700 dark:text-ink-300 mb-4">
              {result.error === "Beaten to it — someone else just claimed this."
                ? "No worries — there will be more callouts. We'll text you next time."
                : "This callout is no longer open."}
            </p>
            <Link href="/dashboard" className="btn-outline inline-flex">Back to dashboard</Link>
          </>
        )}
      </div>
    </main>
  );
}
