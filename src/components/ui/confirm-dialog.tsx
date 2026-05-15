"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Tone = "danger" | "warning" | "default";
type Options = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type Ctx = (opts?: Options) => Promise<boolean>;

const ConfirmCtx = createContext<Ctx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]   = useState(false);
  const [opts, setOpts]   = useState<Options>({});
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirmBtn = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<Ctx>((options) => {
    setOpts(options ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  function close(answer: boolean) {
    setOpen(false);
    resolver.current(answer);
  }

  useEffect(() => {
    if (!open) return;
    confirmBtn.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter")  close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tone: Tone = opts.tone ?? "default";
  const accentRing =
    tone === "danger"  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" :
    tone === "warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" :
                         "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300";
  const confirmClass =
    tone === "danger"  ? "bg-rose-600 hover:bg-rose-700 text-white" :
    tone === "warning" ? "bg-amber-500 hover:bg-amber-600 text-white" :
                         "bg-brand-600 hover:bg-brand-700 text-white";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4"
          onClick={() => close(false)}
        >
          <div
            className="card max-w-md w-full p-5 shadow-2xl bg-white dark:bg-ink-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentRing}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="confirm-title" className="text-base font-semibold text-ink-900 dark:text-ink-50">
                  {opts.title ?? "Are you sure?"}
                </h3>
                {opts.description && (
                  <p id="confirm-desc" className="text-sm text-ink-600 dark:text-ink-400 mt-1">
                    {opts.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
              >
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => close(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${confirmClass}`}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/**
 * Hook returning an async confirm() that resolves to true/false.
 * Falls back to native window.confirm if no provider is mounted (safe default).
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete this item?", tone: "danger" })) { ... }
 */
export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmCtx);
  return ctx ?? (async (opts) => {
    if (typeof window === "undefined") return false;
    return window.confirm(opts?.description ?? opts?.title ?? "Are you sure?");
  });
}
