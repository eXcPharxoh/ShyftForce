"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserCheck } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function ClientRowActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"deactivate" | "reactivate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    const ok = await confirm({
      title: `Deactivate "${name}"?`,
      description: "Historical billing is preserved; locations are unlinked from this client and the record is hidden from active rosters.",
      tone: "warning",
      confirmLabel: "Deactivate client",
    });
    if (!ok) return;
    setBusy("deactivate"); setError(null);
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed");
      return;
    }
    r.refresh();
  }

  async function reactivate() {
    setBusy("reactivate"); setError(null);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed");
      return;
    }
    r.refresh();
  }

  if (!active) {
    return (
      <div className="inline-flex items-center gap-2">
        <button onClick={reactivate} disabled={busy !== null} className="btn-outline text-xs">
          {busy === "reactivate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
          Reactivate
        </button>
        {error && <span className="text-[10px] text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={deactivate} disabled={busy !== null} aria-label={`Deactivate ${name}`} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
        {busy === "deactivate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}
    </div>
  );
}
