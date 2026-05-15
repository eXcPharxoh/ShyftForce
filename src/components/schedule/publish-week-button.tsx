"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check, AlertCircle } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PublishWeekButton({ weekStart, draftCount }: { weekStart: string; draftCount: number }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function publish() {
    if (draftCount === 0) {
      setToast({ kind: "ok", msg: "Nothing to publish — no drafts this week." });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const ok = await confirm({
      title: `Publish ${draftCount} draft shift${draftCount === 1 ? "" : "s"}?`,
      description: "Assigned employees will see these shifts on their dashboard and get notified. Predictability-pay rules kick in for any changes after publish.",
      confirmLabel: "Publish week",
    });
    if (!ok) return;
    setBusy(true); setToast(null);
    const res = await fetch("/api/schedule/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setToast({ kind: "err", msg: data.error ?? "Publish failed" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast({ kind: "ok", msg: `Published ${data.published} shift${data.published === 1 ? "" : "s"}.` });
    setTimeout(() => setToast(null), 2500);
    r.refresh();
  }

  return (
    <>
      <button onClick={publish} disabled={busy} className="btn-primary h-9">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {busy ? "Publishing…" : draftCount > 0 ? `Publish week (${draftCount})` : "Publish week"}
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
