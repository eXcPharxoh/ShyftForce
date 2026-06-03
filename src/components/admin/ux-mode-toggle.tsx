"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wrench, Loader2 } from "lucide-react";

/**
 * Simple / Pro mode picker for the workspace.
 *
 * Lives on /admin (owner-only). Changing the mode immediately changes what
 * the sidebar + /more page show for everyone on the workspace. No data is
 * deleted — the hidden pages still work if visited by URL.
 */
export function UxModeToggle({ initial }: { initial: "simple" | "pro" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"simple" | "pro">(initial);
  const [busy, setBusy] = useState<"simple" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(next: "simple" | "pro") {
    if (next === mode || busy) return;
    setError(null); setBusy(next);
    const res = await fetch("/api/org/ux-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uxMode: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setMode(next);
    router.refresh();
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Workspace mode</h3>
          <p className="text-[12px] text-ink-500 mt-0.5">
            Pick what the app shows by default. Owners can switch any time — no data is lost when you switch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ModeCard
          name="simple"
          label="Simple"
          icon={Sparkles}
          tagline="For small businesses who just want to schedule shifts."
          features={[
            "Schedule, attendance, time off, open shifts",
            "Members, integrations, billing",
            "Industry-specific tools you actually use",
          ]}
          hidden={[
            "Compliance engine, audit log, custom roles",
            "API keys, webhooks (developer tools)",
            "Manager log book, surveys, training",
          ]}
          active={mode === "simple"}
          busy={busy === "simple"}
          onClick={() => pick("simple")}
        />
        <ModeCard
          name="pro"
          label="Pro"
          icon={Wrench}
          tagline="The full app. Power users, multi-admin teams, regulated industries."
          features={[
            "Everything in Simple",
            "Compliance engine + audit log",
            "Custom roles + permissions",
            "API keys + webhooks for integrations",
            "All HR + reporting modules",
          ]}
          hidden={null}
          active={mode === "pro"}
          busy={busy === "pro"}
          onClick={() => pick("pro")}
        />
      </div>

      {error && <div className="mt-3 text-[12px] text-rose-400">{error}</div>}
    </section>
  );
}

function ModeCard({ name, label, icon: Icon, tagline, features, hidden, active, busy, onClick }: {
  name: string;
  label: string;
  icon: any;
  tagline: string;
  features: string[];
  hidden: string[] | null;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-left card p-4 transition relative ${
        active
          ? "border-brand-500/40 bg-brand-500/[0.06] ring-1 ring-brand-500/20"
          : "hover:border-brand-500/30 hover:bg-white/[0.02]"
      }`}
    >
      {active && (
        <div className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-brand-300 bg-brand-500/15 px-2 py-0.5 rounded">
          Current
        </div>
      )}
      {busy && (
        <div className="absolute top-3 right-3">
          <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-brand-300" />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p className="text-[12px] text-ink-500 mb-3">{tagline}</p>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 mb-1.5">Shows</div>
      <ul className="text-[12px] text-ink-300 space-y-0.5 mb-3">
        {features.map((f, i) => <li key={i}>· {f}</li>)}
      </ul>
      {hidden && (
        <>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 mb-1.5">Hides</div>
          <ul className="text-[12px] text-ink-500 space-y-0.5">
            {hidden.map((f, i) => <li key={i}>· {f}</li>)}
          </ul>
        </>
      )}
    </button>
  );
}
