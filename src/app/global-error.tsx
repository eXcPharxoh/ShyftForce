"use client";
import { useEffect } from "react";
import { captureException } from "@/lib/observability";

/**
 * Last-resort error boundary that catches failures in the ROOT layout itself
 * (where error.tsx can't reach). It replaces the whole document, so it must
 * render its own <html>/<body> and rely on inline styles, not global CSS.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060f",
          color: "#e8eaf2",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#9aa0b4", fontSize: 14, marginTop: 8 }}>
            A critical error occurred. Please try again in a moment.
          </p>
          {error.digest && (
            <p style={{ color: "#5b6178", fontSize: 11, marginTop: 8, fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#3a6fd8",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
