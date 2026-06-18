"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";

export function RunPayrollButton({ finchConnected, payPeriodId, unapprovedCount }: { finchConnected: boolean; payPeriodId: string | null; unapprovedCount: number }) {
  const r = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!finchConnected) {
      toast.error("Payroll not connected", { description: "Set it up in Settings → Integrations first." });
      return;
    }
    if (!payPeriodId) {
      toast.error("No open pay period");
      return;
    }
    const ok = await confirm({
      title: "Push timesheets to payroll?",
      description: unapprovedCount > 0
        ? `${unapprovedCount} unapproved entr${unapprovedCount === 1 ? "y" : "ies"} will be skipped. Approved entries get pushed to your connected payroll provider.`
        : "All approved timesheet entries will be pushed to your connected payroll provider.",
      confirmLabel: "Run payroll",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/finch/push-pay", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payPeriodId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error("Payroll push failed", { description: data.error ?? "Try again." });
      return;
    }
    const errorPart = data.errors?.length ? ` · ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}` : "";
    toast.success(`Pushed ${data.pushed} member${data.pushed === 1 ? "" : "s"} to payroll`, {
      description: `${data.skipped} skipped${errorPart}.`,
    });
    r.refresh();
  }

  if (!finchConnected) {
    return (
      <a href="/settings/integrations" className="btn-primary inline-flex">
        <ExternalLink className="w-4 h-4" /> Connect payroll
      </a>
    );
  }

  return (
    <button onClick={run} disabled={busy} className="btn-primary">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      {busy ? "Pushing…" : "Run payroll"}
    </button>
  );
}
