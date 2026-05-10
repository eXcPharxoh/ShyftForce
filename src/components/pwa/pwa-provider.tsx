"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";

let deferredPrompt: any = null;

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [showInstall, setShowInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Capture install prompt
    const onPrompt = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      // Only show if not previously dismissed in last 7 days
      const dismissedAt = parseInt(localStorage.getItem("shyftforce-install-dismissed") || "0", 10);
      if (!dismissedAt || Date.now() - dismissedAt > 7 * 86400 * 1000) setShowInstall(true);
    };
    const onInstalled = () => { setInstalled(true); setShowInstall(false); deferredPrompt = null; };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Also notify SW to drain queue when back online
    const onOnline = () => {
      navigator.serviceWorker?.controller?.postMessage({ type: "drain-clock-queue" });
    };
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setShowInstall(false);
  }

  function dismiss() {
    localStorage.setItem("shyftforce-install-dismissed", String(Date.now()));
    setShowInstall(false);
  }

  return (
    <>
      {children}
      {showInstall && !installed && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm card p-4 animate-fade-up shadow-card-hover bg-white dark:bg-ink-900">
          <button onClick={dismiss} className="absolute top-2 right-2 p-1 rounded-md text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-4">
            <Logo size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Install shyftforce</div>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                Get push notifications, clock in offline, and launch from your home screen.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={install} className="btn-primary text-xs"><Download className="w-3.5 h-3.5" /> Install</button>
                <button onClick={dismiss} className="btn-ghost text-xs">Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
