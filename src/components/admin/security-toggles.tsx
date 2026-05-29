"use client";
import { useEffect, useState } from "react";
import { Loader2, Check, AlertTriangle, ShieldCheck } from "lucide-react";

type Data = {
  require2fa: boolean;
  requireEmailVerified: boolean;
  activeMembers: number;
  twoFactorEnrolled: number;
  emailVerified: number;
};

/**
 * Owner-only workspace security policies. Each toggle previews who'd be
 * locked out before flipping it on — same guardrail pattern as the face
 * verification toggle.
 */
export function SecurityToggles() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<"require2fa" | "requireEmailVerified" | null>(null);
  const [pendingKey, setPendingKey] = useState<keyof Data | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function refresh() {
    const res = await fetch("/api/org/security");
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { refresh(); }, []);

  async function commit(key: "require2fa" | "requireEmailVerified", next: boolean) {
    setBusy(key);
    const res = await fetch("/api/org/security", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    setBusy(null);
    if (res.ok) {
      setData((d) => d ? { ...d, [key]: next } : d);
      setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2000);
    }
  }

  if (!data) return null;

  const unenrolled2fa = Math.max(0, data.activeMembers - data.twoFactorEnrolled);
  const unverifiedEmails = Math.max(0, data.activeMembers - data.emailVerified);

  return (
    <>
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold">Security policies</h3>
          {savedAt && <span className="text-[11px] text-emerald-400 ml-auto inline-flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
        </div>
        <p className="text-[12.5px] text-ink-400 mb-3">
          Workspace-wide rules. Each one previews who&rsquo;d be locked out before you turn it on.
        </p>

        <div className="space-y-3">
          <ToggleRow
            title="Require two-factor authentication"
            desc="Members without TOTP must enroll before they can use the app."
            on={data.require2fa}
            busy={busy === "require2fa"}
            ratio={`${data.twoFactorEnrolled} of ${data.activeMembers} enrolled`}
            warning={unenrolled2fa > 0 ? `Turning this on will lock out ${unenrolled2fa} member${unenrolled2fa === 1 ? "" : "s"} until they enroll.` : null}
            onChange={(v) => {
              if (v && unenrolled2fa > 0) setPendingKey("require2fa");
              else commit("require2fa", v);
            }}
          />
          <ToggleRow
            title="Require verified email"
            desc="Members must verify their email address before accessing the workspace."
            on={data.requireEmailVerified}
            busy={busy === "requireEmailVerified"}
            ratio={`${data.emailVerified} of ${data.activeMembers} verified`}
            warning={unverifiedEmails > 0 ? `Turning this on will lock out ${unverifiedEmails} member${unverifiedEmails === 1 ? "" : "s"} until they verify.` : null}
            onChange={(v) => {
              if (v && unverifiedEmails > 0) setPendingKey("requireEmailVerified");
              else commit("requireEmailVerified", v);
            }}
          />
        </div>
      </section>

      {pendingKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
            <header className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-ink-50">Lock out unenrolled members?</h2>
            </header>
            <div className="px-5 py-4 text-[13px] text-ink-300">
              {pendingKey === "require2fa"
                ? `${unenrolled2fa} of ${data.activeMembers} active members haven't enrolled in 2FA. Turning this on means they can't use the app until they do.`
                : `${unverifiedEmails} of ${data.activeMembers} active members haven't verified their email. Turning this on means they can't use the app until they do.`}
            </div>
            <footer className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button onClick={() => setPendingKey(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={async () => {
                  const k = pendingKey;
                  setPendingKey(null);
                  if (k === "require2fa" || k === "requireEmailVerified") await commit(k, true);
                }}
                className="btn-primary text-sm bg-amber-500 hover:bg-amber-600"
              >
                Yes, turn it on
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({
  title, desc, on, busy, ratio, warning, onChange,
}: {
  title: string; desc: string; on: boolean; busy: boolean;
  ratio: string; warning: string | null; onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onChange(!on)}
          disabled={busy}
          aria-pressed={on}
          className={`shrink-0 w-9 h-5 rounded-full transition relative ${on ? "bg-brand-500" : "bg-ink-700"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink-50">{title}</div>
          <div className="text-[11.5px] text-ink-500 mt-0.5">{desc}</div>
          <div className="text-[11px] text-ink-400 mt-1.5">{busy ? <Loader2 className="w-3 h-3 animate-spin inline" /> : ratio}</div>
          {warning && !on && (
            <div className="text-[11px] text-amber-300 mt-1.5">{warning}</div>
          )}
        </div>
      </div>
    </div>
  );
}
