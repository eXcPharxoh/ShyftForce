"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Mail, KeyRound, Building2, Sparkles, Copy, CheckCircle2 } from "lucide-react";

const INDUSTRIES = [
  { v: "restaurant",    l: "Restaurant" },
  { v: "retail",        l: "Retail" },
  { v: "healthcare",    l: "Healthcare" },
  { v: "field_service", l: "Field service" },
  { v: "office",        l: "Office / admin" },
  { v: "fitness",       l: "Fitness" },
  { v: "security",      l: "Security" },
  { v: "other",         l: "Other" },
] as const;

const PLANS = [
  { v: "trial",      l: "Trial",      hint: "14-day trial (default)" },
  { v: "starter",    l: "Starter",    hint: "Up to 25 employees" },
  { v: "pro",        l: "Pro",        hint: "Unlimited employees + integrations" },
  { v: "enterprise", l: "Enterprise", hint: "Custom contract" },
] as const;

type Result = {
  ok: true;
  organization: { id: string; name: string; slug: string };
  owner?: { id: string; email: string; name: string };
  generatedPassword?: string | null;
  invitation?: { id: string; email: string; expiresAt: string };
};

export function CreateOrgDialog() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<typeof INDUSTRIES[number]["v"]>("restaurant");
  const [plan, setPlan] = useState<typeof PLANS[number]["v"]>("trial");
  const [trialDays, setTrialDays] = useState(14);
  const [isDemo, setIsDemo] = useState(false);
  const [mode, setMode] = useState<"invite" | "create">("invite");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setName(""); setIndustry("restaurant"); setPlan("trial"); setTrialDays(14); setIsDemo(false);
    setMode("invite"); setOwnerName(""); setOwnerEmail(""); setOwnerPassword("");
    setError(null); setResult(null); setBusy(false); setCopied(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/platform/orgs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry,
          plan,
          trialDays: plan === "trial" ? trialDays : 0,
          isDemo,
          mode,
          owner: {
            name: ownerName.trim(),
            email: ownerEmail.trim().toLowerCase(),
            password: mode === "create" && ownerPassword ? ownerPassword : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); setBusy(false); return; }
      setResult(data as Result);
      setBusy(false);
      r.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed"); setBusy(false);
    }
  }

  async function copyPassword() {
    if (!result?.generatedPassword) return;
    await navigator.clipboard.writeText(result.generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        <Plus className="w-4 h-4" /> New organization
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New organization</span>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} aria-label="Close dialog" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>

            {result ? (
              <SuccessPanel result={result} mode={mode} copied={copied} onCopy={copyPassword} onClose={() => { setOpen(false); reset(); }} />
            ) : (
              <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto scroll-thin">
                {/* Org name + industry */}
                <div>
                  <label className="label">Organization name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Security LLC" required minLength={2} />
                  <p className="text-[11px] text-ink-500 mt-1">A URL-friendly slug is generated automatically.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Industry</label>
                    <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value as any)}>
                      {INDUSTRIES.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Plan</label>
                    <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as any)}>
                      {PLANS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                  </div>
                </div>

                {plan === "trial" && (
                  <div>
                    <label className="label">Trial length</label>
                    <div className="flex items-center gap-2">
                      <input className="input w-24" type="number" min={0} max={365} value={trialDays} onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)} />
                      <span className="text-sm text-ink-500">days</span>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm rounded-lg border border-ink-200 dark:border-ink-800 p-3 hover:bg-ink-50/40 dark:hover:bg-ink-800/40 cursor-pointer">
                  <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} className="mt-0.5 rounded text-brand-500 focus:ring-brand-500" />
                  <span>
                    <span className="font-semibold">Mark as demo</span>
                    <span className="block text-[11px] text-ink-500">Demo orgs are excluded from your real customer counts and billing reports.</span>
                  </span>
                </label>

                {/* Mode selector */}
                <div>
                  <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider mb-1.5">Owner setup</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMode("invite")} className={`text-left rounded-xl border p-3 transition ${mode === "invite" ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/15" : "border-ink-200 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40"}`}>
                      <div className="flex items-center gap-1.5 font-semibold text-sm"><Mail className="w-3.5 h-3.5" /> Invite owner</div>
                      <p className="text-[11px] text-ink-500 mt-0.5">Email an invitation link; they set their own password.</p>
                    </button>
                    <button type="button" onClick={() => setMode("create")} className={`text-left rounded-xl border p-3 transition ${mode === "create" ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/15" : "border-ink-200 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40"}`}>
                      <div className="flex items-center gap-1.5 font-semibold text-sm"><KeyRound className="w-3.5 h-3.5" /> Create directly</div>
                      <p className="text-[11px] text-ink-500 mt-0.5">Pre-create the user. Pre-verified so they can log in right away.</p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Owner name</label>
                    <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Doe" required minLength={2} />
                  </div>
                  <div>
                    <label className="label">Owner email</label>
                    <input className="input" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@company.com" required />
                  </div>
                </div>

                {mode === "create" && (
                  <div>
                    <label className="label">Temporary password <span className="text-ink-400 font-normal">(optional)</span></label>
                    <input className="input" type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Leave blank to auto-generate" minLength={8} />
                    <p className="text-[11px] text-ink-500 mt-1">If blank, we'll generate a strong password and show it once after creation.</p>
                  </div>
                )}

                {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2.5 border border-rose-200 dark:border-rose-500/30">{error}</div>}

                <footer className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800 -mx-5 -mb-5 px-5 py-3 bg-ink-50/50 dark:bg-ink-900">
                  <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={busy} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {busy ? "Creating…" : "Create organization"}
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SuccessPanel({
  result, mode, copied, onCopy, onClose,
}: { result: Result; mode: "invite" | "create"; copied: boolean; onCopy: () => void; onClose: () => void }) {
  return (
    <div className="p-6 space-y-4 overflow-y-auto scroll-thin">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 dark:from-emerald-500/10 dark:to-brand-500/10 p-5 text-center border border-emerald-200/60 dark:border-emerald-500/30">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg">{result.organization.name} is live</h3>
        <p className="text-sm text-ink-600 dark:text-ink-300 mt-1">
          Slug: <span className="font-mono">{result.organization.slug}</span>
        </p>
      </div>

      {mode === "invite" && result.invitation && (
        <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4">
          <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider mb-2">Invitation sent</div>
          <p className="text-sm">An invite email was sent to <b>{result.invitation.email}</b>.</p>
          <p className="text-[11px] text-ink-500 mt-1">Expires {new Date(result.invitation.expiresAt).toLocaleDateString()}. They click the link, set a password, and land in their new workspace.</p>
        </div>
      )}

      {mode === "create" && result.owner && (
        <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 space-y-2">
          <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">Owner account</div>
          <div className="text-sm"><b>{result.owner.name}</b> · {result.owner.email}</div>
          {result.generatedPassword && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3">
              <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">⚠ Temporary password (shown ONCE)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-white dark:bg-ink-900 rounded px-2 py-1 select-all">{result.generatedPassword}</code>
                <button onClick={onCopy} className="btn-outline text-xs">
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">A password-reset email was also sent so they can pick their own.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <a href={`/platform/orgs/${result.organization.id}`} className="btn-outline">View organization</a>
        <button onClick={onClose} className="btn-primary">Done</button>
      </div>
    </div>
  );
}
