"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

type State = "loading" | "unsupported" | "disabled" | "enabled" | "error";

export function EnablePushButton() {
  const [state, setState]   = useState<State>("loading");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC) {
      setState("unsupported"); return;
    }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "enabled" : "disabled");
      } catch { setState("error"); }
    })();
  }, []);

  async function enable() {
    setBusy(true); setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications blocked in browser. Allow them in Site Settings to enable push.");
        setBusy(false); return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // TS DOM types over-narrow this; the runtime accepts a Uint8Array.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const raw = sub.toJSON();
      const res = await fetch("/api/me/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: raw.keys,
          userAgent: navigator.userAgent.slice(0, 200),
        }),
      });
      if (!res.ok) throw new Error("Server rejected the subscription");
      setState("enabled");
    } catch (e: any) {
      setError(e?.message ?? "Failed to enable");
      setState("error");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/me/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        await sub.unsubscribe();
      }
      setState("disabled");
    } catch (e: any) {
      setError(e?.message ?? "Failed to disable");
    } finally { setBusy(false); }
  }

  if (state === "loading") {
    return <span className="text-xs text-ink-500"><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> Checking push…</span>;
  }
  if (state === "unsupported") {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
        Push notifications need a modern browser. On iPhone, install ShyftForce to your Home Screen first.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {state === "enabled" ? (
        <>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Push is on
          </span>
          <button onClick={disable} disabled={busy} className="btn-outline text-xs">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />} Turn off
          </button>
        </>
      ) : (
        <button onClick={enable} disabled={busy} className="btn-primary text-xs">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Enable push notifications
        </button>
      )}
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
