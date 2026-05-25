"use client";
import { useEffect } from "react";

/**
 * Route-level error boundary. Catches errors thrown while rendering any page
 * segment (within the root layout) so users get a branded recovery screen
 * instead of a raw Next.js error overlay in production.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 text-ink-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-ink-400 mt-2 text-sm leading-relaxed">
          An unexpected error occurred. You can try again, or head back to your dashboard.
        </p>
        {error.digest && (
          <p className="text-[11px] text-ink-600 mt-3 font-mono">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">Try again</button>
          <a href="/dashboard" className="btn-ghost">Go to dashboard</a>
        </div>
      </div>
    </div>
  );
}
