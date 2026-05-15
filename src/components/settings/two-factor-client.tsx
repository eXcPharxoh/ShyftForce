"use client";
import { useState } from "react";
import { Loader2, ShieldCheck, ShieldX, Copy, CheckCircle2, AlertCircle, QrCode } from "lucide-react";

type EnrollResp = {
  secret: string;
  uri: string;
  recoveryCodes: string[];
};

export function TwoFactorClient({ initialEnabled, email }: { initialEnabled: boolean; email: string }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep]       = useState<"idle" | "enroll" | "verify">("idle");
  const [enroll, setEnroll]   = useState<EnrollResp | null>(null);
  const [code, setCode]       = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState<"secret" | "codes" | null>(null);

  async function start() {
    setBusy(true); setError(null);
    const res = await fetch("/api/me/2fa", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setEnroll(d); setStep("enroll");
  }

  async function verify() {
    setBusy(true); setError(null);
    const res = await fetch("/api/me/2fa", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Invalid code"); return; }
    setEnabled(true); setStep("idle"); setEnroll(null); setCode("");
  }

  async function disable() {
    setBusy(true); setError(null);
    const res = await fetch("/api/me/2fa", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: disableCode }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Invalid code"); return; }
    setEnabled(false); setDisableCode("");
  }

  async function copy(text: string, which: "secret" | "codes") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (enabled && step === "idle") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" /> 2FA is enabled on this account
        </div>
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/10 p-3">
          <div className="text-xs font-semibold text-rose-900 dark:text-rose-200 mb-2">Turn off 2FA</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input className="input w-32" value={disableCode} onChange={(e) => setDisableCode(e.target.value)}
              maxLength={6} pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" />
            <button onClick={disable} disabled={busy || disableCode.length !== 6} className="btn-outline text-xs border-rose-300 text-rose-700 dark:border-rose-500/40 dark:text-rose-300">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldX className="w-3.5 h-3.5" />} Disable 2FA
            </button>
          </div>
          {error && <div className="text-[11px] text-rose-600 mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  if (step === "enroll" && enroll) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4">
          <h4 className="font-semibold text-sm flex items-center gap-1.5"><QrCode className="w-4 h-4 text-amber-600" /> Scan or enter the key</h4>
          <p className="text-[11px] text-ink-700 dark:text-ink-300 mt-1">Open your authenticator app and scan the QR code, or paste the secret manually.</p>
          <div className="mt-3 flex items-start gap-4 flex-wrap">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(enroll.uri)}`}
              alt="2FA QR code" className="w-40 h-40 rounded-lg bg-white p-2" />
            <div className="flex-1 min-w-0">
              <label className="label">Secret (case-insensitive, no spaces)</label>
              <div className="flex items-center gap-2">
                <code className="input flex-1 text-xs font-mono select-all break-all">{enroll.secret}</code>
                <button type="button" onClick={() => copy(enroll.secret, "secret")} className="btn-outline text-xs shrink-0">
                  {copied === "secret" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-ink-500 mt-1">Account label: <code>ShyftForce:{email}</code></p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4">
          <h4 className="font-semibold text-sm">Save your recovery codes</h4>
          <p className="text-[11px] text-ink-500 mt-1">Each one works once and can recover your account if you lose your phone. Stored hashed — we can't show them again.</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-xs">
            {enroll.recoveryCodes.map(c => <div key={c} className="px-2 py-1 rounded bg-ink-100 dark:bg-ink-800 select-all">{c}</div>)}
          </div>
          <button type="button" onClick={() => copy(enroll.recoveryCodes.join("\n"), "codes")} className="btn-outline text-xs mt-3">
            {copied === "codes" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy all codes
          </button>
        </div>

        <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 p-4">
          <h4 className="font-semibold text-sm">Verify a code to finish</h4>
          <p className="text-[11px] text-ink-500 mt-1">Type the 6-digit code currently showing in your authenticator app.</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <input className="input w-32" value={code} onChange={(e) => setCode(e.target.value)}
              maxLength={6} pattern="[0-9]{6}" placeholder="000000" inputMode="numeric" autoFocus />
            <button onClick={verify} disabled={busy || code.length !== 6} className="btn-primary text-xs">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Verify & enable
            </button>
            <button type="button" onClick={() => { setStep("idle"); setEnroll(null); setError(null); }} className="btn-ghost text-xs">Cancel</button>
          </div>
          {error && <div className="text-[11px] text-rose-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-ink-500 text-sm">
        <ShieldX className="w-4 h-4" /> 2FA is not yet enabled
      </div>
      <button onClick={start} disabled={busy} className="btn-primary text-sm">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Set up 2FA
      </button>
      {error && <div className="text-[11px] text-rose-600">{error}</div>}
    </div>
  );
}
