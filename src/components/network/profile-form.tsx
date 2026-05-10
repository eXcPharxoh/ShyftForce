"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Plus, X, Globe } from "lucide-react";

type Profile = {
  legalFirstName: string | null;
  legalLastName: string | null;
  bio: string | null;
  city: string | null;
  stateRegion: string | null;
  skills: string[];
  discoverable: boolean;
  reputationScore: number | null;
  totalShiftsCompleted: number;
  totalEmployers: number;
};

export function ProfileForm({ initial }: { initial: Profile }) {
  const r = useRouter();
  const [p, setP] = useState(initial);
  const [skillDraft, setSkillDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null); setDone(false);
    const res = await fetch("/api/worker-profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalFirstName: p.legalFirstName,
        legalLastName: p.legalLastName,
        bio: p.bio,
        city: p.city,
        stateRegion: p.stateRegion,
        skills: p.skills,
        discoverable: p.discoverable,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Save failed"); return; }
    setDone(true);
    r.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  function addSkill() {
    const s = skillDraft.trim();
    if (!s || p.skills.includes(s) || p.skills.length >= 20) { setSkillDraft(""); return; }
    setP({ ...p, skills: [...p.skills, s] });
    setSkillDraft("");
  }

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/10">
        <input type="checkbox" checked={p.discoverable} onChange={(e) => setP({ ...p, discoverable: e.target.checked })} className="rounded border-ink-300 text-brand-500 w-4 h-4" />
        <Globe className="w-4 h-4 text-brand-700 dark:text-brand-300" />
        <div className="flex-1">
          <div className="font-semibold text-sm text-brand-900 dark:text-brand-100">Discoverable on the network</div>
          <div className="text-[11px] text-brand-700 dark:text-brand-300">Other employers can see your profile + you can claim cross-employer shifts when your home schedule has gaps.</div>
        </div>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Legal first name</label>
          <input className="input" value={p.legalFirstName ?? ""} onChange={(e) => setP({ ...p, legalFirstName: e.target.value || null })} />
        </div>
        <div>
          <label className="label">Legal last name</label>
          <input className="input" value={p.legalLastName ?? ""} onChange={(e) => setP({ ...p, legalLastName: e.target.value || null })} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={p.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value || null })} placeholder="Boston" />
        </div>
        <div>
          <label className="label">State / region</label>
          <input className="input" value={p.stateRegion ?? ""} onChange={(e) => setP({ ...p, stateRegion: e.target.value || null })} placeholder="MA" />
        </div>
      </div>

      <div>
        <label className="label">Bio</label>
        <textarea className="input min-h-[88px]" value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value || null })} placeholder="One short paragraph employers will see. Roles you've done, what you're looking for, your ideal schedule." />
      </div>

      <div>
        <label className="label">Skills</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-100 dark:bg-ink-800 text-xs">
              {s}
              <button onClick={() => setP({ ...p, skills: p.skills.filter((x) => x !== s) })} className="text-ink-400 hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {p.skills.length === 0 && <span className="text-[11px] text-ink-500">Add skills like &quot;line cook&quot;, &quot;barista&quot;, &quot;security officer&quot;.</span>}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type a skill and press Enter"
          />
          <button onClick={addSkill} className="btn-outline text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-ink-100 dark:border-ink-800">
        <Stat label="Reputation" value={p.reputationScore == null ? "—" : `${p.reputationScore.toFixed(0)}/100`} />
        <Stat label="Shifts completed" value={p.totalShiftsCompleted} />
        <Stat label="Employers worked" value={p.totalEmployers} />
      </div>

      {error && <div className="text-rose-600 text-xs">{error}</div>}

      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {done ? "Saved" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-700 p-3 text-center">
      <div className="text-[10px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
