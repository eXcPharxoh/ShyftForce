import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TwoFactorClient } from "@/components/settings/two-factor-client";
import { EnablePushButton } from "@/components/push/enable-push-button";
import { ShieldCheck, Bell } from "lucide-react";

export default async function SecurityPage() {
  const u = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { totpEnabled: true } });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Account"
        icon={ShieldCheck}
        title="Security"
        subtitle="Two-factor authentication and device-level push notifications."
      />

      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1"><ShieldCheck className="w-4 h-4 text-brand-500" /> Two-factor authentication</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Add a second step to your sign-in using Google Authenticator, Authy, 1Password, or Microsoft Authenticator.
          Once enabled, every login asks for a 6-digit code.
        </p>
        <TwoFactorClient initialEnabled={!!user?.totpEnabled} email={u.email} />
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Bell className="w-4 h-4 text-brand-500" /> Push notifications on this device</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Get desktop / mobile-home-screen push alerts for shift offers, schedule changes, and time-off decisions.
          Works in Chrome, Firefox, Edge, and iOS 16.4+ (add ShyftForce to your Home Screen first).
        </p>
        <EnablePushButton />
      </section>
    </div>
  );
}
