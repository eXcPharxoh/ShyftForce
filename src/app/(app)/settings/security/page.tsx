import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TwoFactorClient } from "@/components/settings/two-factor-client";
import { EnablePushButton } from "@/components/push/enable-push-button";
import { DataExportClient } from "@/components/settings/data-export-client";
import { DeleteAccountClient } from "@/components/settings/delete-account-client";
import { ShieldCheck, Bell, Download, AlertTriangle } from "lucide-react";

export default async function SecurityPage() {
  const u = await requireUser();
  const [user, lastExport] = await Promise.all([
    prisma.user.findUnique({ where: { id: u.id }, select: { totpEnabled: true } }),
    prisma.dataExportRequest.findFirst({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, sizeBytes: true, createdAt: true, completedAt: true, expiresAt: true },
    }),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Account"
        icon={ShieldCheck}
        title="Security & privacy"
        subtitle="Two-factor auth, push notifications, GDPR data export + deletion."
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

      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Download className="w-4 h-4 text-brand-500" /> Your data</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          GDPR / CCPA / PIPEDA right-to-portability. Download every record we hold about you as a single JSON file.
        </p>
        <DataExportClient initialExport={lastExport
          ? { ...lastExport, createdAt: lastExport.createdAt.toISOString(), completedAt: lastExport.completedAt?.toISOString() ?? null, expiresAt: lastExport.expiresAt?.toISOString() ?? null }
          : null} />
      </section>

      <section className="card p-5 border-rose-200 dark:border-rose-500/30">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-rose-900 dark:text-rose-200 mb-1">
          <AlertTriangle className="w-4 h-4 text-rose-600" /> Delete my account
        </h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Anonymizes your personal info: name, email, avatar, phone, emergency contacts, 2FA secret, OAuth links, push devices.
          Wage and timesheet records are retained per labor law. Type the exact phrase to confirm.
        </p>
        <DeleteAccountClient role={u.role} />
      </section>
    </div>
  );
}
