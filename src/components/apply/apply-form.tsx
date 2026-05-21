"use client";

import { useState } from "react";
import { Loader2, Check, Send } from "lucide-react";

export function ApplyForm({ token, orgName }: { token: string; orgName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeText, setResumeText] = useState("");

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/apply/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          coverLetter: coverLetter.trim() || null,
          resumeText: resumeText.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Submission failed"); setBusy(false); return; }
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="font-display text-[22px] font-medium">Application sent</h2>
        <p className="text-[13.5px] text-ink-300 mt-2 max-w-md mx-auto">
          Thanks, {name.split(" ")[0]} — {orgName} has your application. If they want to move forward,
          you'll hear back at <span className="font-mono text-ink-200">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-brand-400">Apply now · ~60 seconds</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Full name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required maxLength={120}
            placeholder="Alex Morgan"
          />
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required maxLength={180}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="label">Phone</label>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={40}
          placeholder="(555) 555-5555"
        />
      </div>

      <div>
        <label className="label">Why are you a good fit? (optional)</label>
        <textarea
          className="input"
          rows={4}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          maxLength={8000}
          placeholder="A short note about your background, availability, or anything we should know."
        />
      </div>

      <div>
        <label className="label">Past experience / resume (optional)</label>
        <textarea
          className="input"
          rows={5}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          maxLength={20000}
          placeholder="Paste your resume here, or list your last 2–3 jobs with dates."
        />
        <p className="text-[11px] text-ink-500 mt-1">
          We support pasted text for now — file uploads are coming soon.
        </p>
      </div>

      {error && <div className="text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 text-[13px]">{error}</div>}

      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-ink-500">By submitting, you agree to {orgName} reviewing your application.</div>
        <button type="submit" disabled={busy || !name.trim() || !email.trim()} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? "Sending…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}
