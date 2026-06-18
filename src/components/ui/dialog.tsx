"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * App-wide dialog primitive. Replaces the dozens of one-off modals
 * (every component used to hand-roll its own fixed inset-0 backdrop +
 * panel + close handler with slightly different chrome). Use this
 * everywhere new — old modals can be swept gradually.
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Edit shift">
 *     <p>Content goes here.</p>
 *     <DialogFooter>
 *       <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
 *       <button className="btn-primary" onClick={submit}>Save</button>
 *     </DialogFooter>
 *   </Dialog>
 *
 * Handles:
 *   - Backdrop click dismiss (toggle via dismissOnBackdrop=false)
 *   - Escape key dismiss
 *   - Auto-focus the first focusable element on open
 *   - Lock body scroll while open
 *   - Smooth backdrop blur-in + panel scale-in animations
 *   - Returns focus to the trigger when closed
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  dismissOnBackdrop = true,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** sm=24rem, md=32rem, lg=42rem, xl=56rem, full=92vw */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  dismissOnBackdrop?: boolean;
  hideClose?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Escape to close + remember the prior focused element so we can return
  // focus to it (the trigger button, usually) when the dialog closes.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Body scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first focusable inside the panel
    setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to the element that opened us, if it's still around
      const prev = previousFocusRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = {
    sm:   "max-w-sm",
    md:   "max-w-lg",
    lg:   "max-w-2xl",
    xl:   "max-w-4xl",
    full: "max-w-[92vw]",
  }[size];

  return (
    <div
      className="modal-backdrop"
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`modal-panel ${maxW} max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        aria-describedby={description ? "dialog-description" : undefined}
      >
        {(title || !hideClose) && (
          <header className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3 shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="dialog-title" className="text-[15px] font-semibold text-ink-50 leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-description" className="text-[13px] text-ink-400 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="icon-btn shrink-0 -mt-1 -mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </header>
        )}

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky footer for dialog actions. Renders right-aligned, with a
 * top border to separate from the body content. Mobile collapses
 * to a stacked column so buttons don't squish.
 */
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="px-5 py-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 shrink-0">
      {children}
    </footer>
  );
}
