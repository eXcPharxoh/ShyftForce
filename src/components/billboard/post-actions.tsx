"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";

export function PostDeleteButton({ id, title }: { id: string; title: string }) {
  const r = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function go() {
    const ok = await confirm({
      title: `Delete "${title}"?`,
      description: "The post is removed for everyone. There is no undo.",
      tone: "danger",
      confirmLabel: "Delete post",
    });
    if (!ok) return;
    setBusy(true);
    // Check the result — previously this refreshed regardless, so a failed
    // delete looked identical to a successful one (post still there, no error).
    try {
      const res = await fetch(`/api/billboard/${id}`, { method: "DELETE" });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Couldn't delete the post", { description: data.error ?? "Please try again." });
        return;
      }
      r.refresh();
    } catch {
      setBusy(false);
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
    }
  }

  return (
    <button onClick={go} disabled={busy} aria-label="Delete post" className="text-xs text-ink-400 hover:text-rose-600 transition flex items-center gap-1">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </button>
  );
}
