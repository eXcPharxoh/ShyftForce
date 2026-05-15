"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function EndImpersonationButton() {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await fetch("/api/platform/impersonate", { method: "DELETE" });
    r.push("/platform");
    r.refresh();
  }
  return (
    <button onClick={go} disabled={busy} className="underline hover:no-underline inline-flex items-center gap-1.5">
      {busy && <Loader2 className="w-3 h-3 animate-spin" />}
      End impersonation
    </button>
  );
}
