"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from "lucide-react";

/**
 * App-wide toast system. Replaces the dozens of one-off inline toasts
 * scattered across the codebase (every component invents its own
 * fixed-bottom div with a setTimeout cleanup). Add the <Toaster /> once
 * at the top of the app shell layout; anywhere in the tree, call
 * `useToast()` to push.
 *
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Couldn't save", { description: "Network blip — try again." });
 *   toast.loading("Publishing schedule…", { id: "publish" });
 *   toast.dismiss("publish");  // when the work finishes
 *
 * Toasts stack from bottom-center, animate in/out with a slide+fade,
 * and self-dismiss after 4 seconds (10s for errors, never for loading).
 */

export type ToastKind = "success" | "error" | "info" | "loading";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** ms; 0 = never auto-dismiss (default for loading) */
  duration?: number;
};

type ToastContext = {
  push: (t: Omit<Toast, "id"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  success: (title: string, opts?: Partial<Toast>) => string;
  error: (title: string, opts?: Partial<Toast>) => string;
  info: (title: string, opts?: Partial<Toast>) => string;
  loading: (title: string, opts?: Partial<Toast>) => string;
};

const Ctx = createContext<ToastContext | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id"> & { id?: string }) => {
      const id = t.id ?? `t-${++counter}-${Date.now()}`;
      const duration = t.duration ?? (t.kind === "loading" ? 0 : t.kind === "error" ? 10_000 : 4_000);
      setToasts((prev) => {
        // If a toast with this id already exists, replace it (used by
        // toast.loading → toast.success patterns).
        const filtered = prev.filter((x) => x.id !== id);
        return [...filtered, { ...t, id }];
      });
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const ctx: ToastContext = {
    push,
    dismiss,
    success: (title, opts) => push({ kind: "success", title, ...opts }),
    error:   (title, opts) => push({ kind: "error",   title, ...opts }),
    info:    (title, opts) => push({ kind: "info",    title, ...opts }),
    loading: (title, opts) => push({ kind: "loading", title, ...opts }),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

/**
 * Hook for pushing toasts. If called outside <ToastProvider>, returns a
 * no-op shim so the app doesn't crash — useful during SSR or in tests.
 */
export function useToast(): ToastContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      push: () => "",
      dismiss: () => {},
      success: () => "",
      error: () => "",
      info: () => "",
      loading: () => "",
    };
  }
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Rendering                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const KIND_STYLES: Record<ToastKind, { ring: string; bg: string; icon: React.ReactNode }> = {
  success: {
    ring: "rgba(78,224,197,0.35)",
    bg: "linear-gradient(180deg, rgba(78,224,197,0.10), rgba(78,224,197,0.04))",
    icon: <CheckCircle2 className="w-5 h-5 text-success" />,
  },
  error: {
    ring: "rgba(241,122,142,0.35)",
    bg: "linear-gradient(180deg, rgba(241,122,142,0.10), rgba(241,122,142,0.04))",
    icon: <AlertTriangle className="w-5 h-5 text-danger" />,
  },
  info: {
    ring: "rgba(106,162,255,0.35)",
    bg: "linear-gradient(180deg, rgba(106,162,255,0.10), rgba(106,162,255,0.04))",
    icon: <Info className="w-5 h-5 text-brand-300" />,
  },
  loading: {
    ring: "rgba(255,255,255,0.18)",
    bg: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
    icon: <Loader2 className="w-5 h-5 text-ink-300 animate-spin" />,
  },
};

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = KIND_STYLES[toast.kind];
  const [exiting, setExiting] = useState(false);

  // When the parent removes us from the list we just unmount. The exit
  // animation runs locally if the user dismisses with the X button.
  function handleDismiss() {
    setExiting(true);
    setTimeout(onDismiss, 180);
  }

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto min-w-[320px] max-w-[480px] rounded-lg border backdrop-blur-xl shadow-2xl px-4 py-3 flex items-start gap-3 ${
        exiting ? "toast-out" : "toast-in"
      }`}
      style={{
        background: `${s.bg}, rgba(13,20,34,0.85)`,
        borderColor: s.ring,
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.04), 0 12px 32px -8px rgba(0,0,0,0.45), 0 0 0 1px ${s.ring}`,
      }}
    >
      <div className="shrink-0 mt-0.5">{s.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-ink-50 leading-tight">{toast.title}</div>
        {toast.description && (
          <div className="text-[12.5px] text-ink-300 mt-0.5 leading-relaxed">{toast.description}</div>
        )}
      </div>
      {toast.kind !== "loading" && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 -mt-1 p-1 rounded hover:bg-white/[0.06] text-ink-500 hover:text-ink-200 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
