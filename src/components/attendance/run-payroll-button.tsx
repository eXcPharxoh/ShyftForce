"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function RunPayrollButton({ finchConnected, payPeriodId, unapprovedCount }: { finchConnected: boolean; payPeriodId: string | null; unapprovedCount: number }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function run() {
    if (!finchConnected) {
      setToast({ kind: "err", msg: "Connect a payroll provider in Settings → Integrations first." });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!payPeriodId) {
      setToast({ kind: "err", msg: "No open pay period." });
      setTimeout(() => setToast(null), 3000);
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
    setBusy(true); setToast(null);
    const res = await fetch("/api/finch/push-pay", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payPeriodId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setToast({ kind: "err", msg: data.error ?? "Payroll push failed" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setToast({ kind: "ok", msg: `Pushed ${data.pushed} member${data.pushed === 1 ? "" : "s"} · ${data.skipped} skipped${data.errors?.length ? ` · ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}` : ""}` });
    setTimeout(() => setToast(null), 5000);
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
    <>
      <button onClick={run} disabled={busy} className="btn-primary">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {busy ? "Pushing…" : "Run payroll"}
      </button>
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-soft animate-fade-up flex items-center gap-2 ${toast.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {toast.kind === "ok" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}
