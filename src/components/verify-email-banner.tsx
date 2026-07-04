"use client";
import { useState } from "react";
import { Mail, X, Loader2, Check } from "lucide-react";

/**
 * Soft reminder banner shown to users whose email isn't verified — and whose
 * workspace doesn't HARD-require it (the hard-require gate redirects to
 * /verify-email instead). SessionStorage-dismissable so we don't nag forever.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("sf-verify-email-dismissed") === "1";
  });
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  if (hidden) return null;

  function dismiss() {
    sessionStorage.setItem("sf-verify-email-dismissed", "1");
    setHidden(true);
  }

  async function doResend() {
    if (resend === "sending" || resend === "sent") return;
    setResend("sending"); setResendMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResend("sent");
        setResendMsg(data.alreadyVerified ? "Already verified — you're all set." : null);
      } else {
        setResend("error");
        setResendMsg(data.error ?? "Couldn't resend right now — try again shortly.");
      }
    } catch {
      setResend("error");
      setResendMsg("Couldn't reach the server — check your connection.");
    }
  }

  return (
    <div className="px-4 py-2 text-xs flex items-center justify-between gap-3 flex-wrap bg-amber-500/15 border-b border-amber-500/30 text-amber-200">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold shrink-0">Verify your email</span>
        <span className="text-amber-100/90 truncate">
          {resendMsg
            ? resendMsg
            : <>We sent a link to <b>{email}</b>. Verifying unlocks password resets and unblocks future security requirements.</>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {resend === "sent" ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-emerald-200">
            <Check className="w-3.5 h-3.5" /> Sent — check your inbox
          </span>
        ) : (
          <button
            onClick={doResend}
            disabled={resend === "sending"}
            className="inline-flex items-center gap-1 underline hover:no-underline whitespace-nowrap font-semibold disabled:opacity-60"
          >
            {resend === "sending" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {resend === "sending" ? "Sending…" : "Resend link"}
          </button>
        )}
        <button onClick={dismiss} aria-label="Dismiss banner" className="p-1 rounded hover:bg-amber-500/20">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
