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
      // Session-dismissed? Don't reappear this session.
      if (sessionStorage.getItem("shyftforce-install-dismissed-session")) return;
      // Long-dismissed? Respect the chosen duration (X = 7 days, "Later" = 3 days).
      const dismissedAt = parseInt(localStorage.getItem("shyftforce-install-dismissed") || "0", 10);
      const dismissedDays = parseInt(localStorage.getItem("shyftforce-install-dismissed-days") || "7", 10);
      if (dismissedAt && Date.now() - dismissedAt < dismissedDays * 86400 * 1000) return;
      // Delay so it doesn't slam the first paint
      setTimeout(() => setShowInstall(true), 5000);
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
    sessionStorage.setItem("shyftforce-install-dismissed-session", "1");
  }

  function dismiss(persistent = false) {
    // Both options persist now — X for 7 days, "Later" for 3 — so the prompt
    // stops nagging users who don't want it on every page load.
    localStorage.setItem("shyftforce-install-dismissed", String(Date.now()));
    localStorage.setItem("shyftforce-install-dismissed-days", persistent ? "7" : "3");
    sessionStorage.setItem("shyftforce-install-dismissed-session", "1");
    setShowInstall(false);
  }

  return (
    <>
      {children}
      {showInstall && !installed && (
        // Bottom-LEFT corner so it doesn't cover the most common bottom-right action targets
        // (message input, FABs, etc). Compact form so it doesn't dominate.
        <div className="fixed bottom-4 left-4 z-[60] max-w-xs card p-3 animate-fade-up shadow-card-hover bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700">
          <button
            onClick={() => dismiss(true)}
            aria-label="Dismiss for 7 days"
            className="absolute top-1.5 right-1.5 p-1 rounded-md text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-2.5 pr-4">
            <Logo size="sm" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-ink-900 dark:text-ink-50">Install ShyftForce</div>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5 leading-snug">
                One-tap clock-in from your home screen.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <button onClick={install} className="btn-primary text-[11px] h-7 px-2.5">
                  <Download className="w-3 h-3" /> Install
                </button>
                <button onClick={() => dismiss(false)} className="btn-ghost text-[11px] h-7 px-2">Later</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
