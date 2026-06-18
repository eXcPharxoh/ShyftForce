"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";

export function PublishWeekButton({ weekStart, draftCount }: { weekStart: string; draftCount: number }) {
  const r = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (draftCount === 0) {
      toast.info("Nothing to publish", { description: "No drafts this week." });
      return;
    }
    const ok = await confirm({
      title: `Publish ${draftCount} draft shift${draftCount === 1 ? "" : "s"}?`,
      description: "Assigned employees will see these shifts on their dashboard and get notified. Predictability-pay rules kick in for any changes after publish.",
      confirmLabel: "Publish week",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/schedule/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't publish", { description: data.error ?? "Try again." });
      return;
    }
    toast.success(`Published ${data.published} shift${data.published === 1 ? "" : "s"}`, {
      description: "Your team has been notified.",
    });
    r.refresh();
  }

  return (
    <button onClick={publish} disabled={busy} className="btn-primary h-9">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      {busy ? "Publishing…" : draftCount > 0 ? `Publish week (${draftCount})` : "Publish week"}
    </button>
  );
}
