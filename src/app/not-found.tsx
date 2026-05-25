import Link from "next/link";

/** Branded 404 — replaces Next's bare default not-found page in production. */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 text-ink-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold grad-text-accent">404</div>
        <h1 className="text-xl font-semibold mt-3 tracking-tight">Page not found</h1>
        <p className="text-ink-400 mt-2 text-sm leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}
