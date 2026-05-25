import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SuspendedGate } from "@/components/suspended-gate";

export const dynamic = "force-dynamic";

/**
 * Standalone suspension landing. requireUser() redirects here when a platform
 * admin has frozen the org — it lives OUTSIDE the (app) layout so there's no
 * redirect loop (the layout itself calls requireUser). If the workspace isn't
 * actually suspended (or the visitor isn't signed in) we bounce them back.
 */
export default async function SuspendedPage() {
  const u = await getSessionUser();
  if (!u) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: u.organizationId },
    select: { suspendedAt: true, suspendedReason: true },
  });

  const suspended = !!org?.suspendedAt && org.suspendedAt < new Date();
  if (!suspended) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <SuspendedGate reason={org?.suspendedReason ?? null} />
    </div>
  );
}
