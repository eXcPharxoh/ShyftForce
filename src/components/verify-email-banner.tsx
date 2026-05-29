"use client";
import Link from "next/link";
import { useState } from "react";
import { Mail, X } from "lucide-react";

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
  if (hidden) return null;

  function dismiss() {
    sessionStorage.setItem("sf-verify-email-dismissed", "1");
    setHidden(true);
  }

  return (
    <div className="px-4 py-2 text-xs flex items-center justify-between gap-3 flex-wrap bg-amber-500/15 border-b border-amber-500/30 text-amber-200">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold shrink-0">Verify your email</span>
        <span className="text-amber-100/90 truncate">
          We sent a link to <b>{email}</b>. Verifying unlocks password resets and unblocks future security requirements.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/verify-email" className="underline hover:no-underline whitespace-nowrap font-semibold">
          Resend link
        </Link>
        <button onClick={dismiss} aria-label="Dismiss banner" className="p-1 rounded hover:bg-amber-500/20">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
