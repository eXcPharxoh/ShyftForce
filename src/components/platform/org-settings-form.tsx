"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  plan: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null; // ISO
  isDemo: boolean;
  timezone: string;
};

const INDUSTRIES = ["restaurant", "retail", "healthcare", "field_service", "office", "fitness", "security", "other"];

export function OrgSettingsForm({ org }: { org: Org }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [name, setName] = useState(org.name);
  const [industry, setIndustry] = useState(org.industry ?? "other");
  const [plan, setPlan] = useState(org.plan);
  const [status, setStatus] = useState(org.subscriptionStatus ?? "");
  const [trialEndsAt, setTrialEndsAt] = useState(org.trialEndsAt ? org.trialEndsAt.slice(0, 10) : "");
  const [isDemo, setIsDemo] = useState(org.isDemo);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const body: any = { name, industry, plan, isDemo };
    if (status) body.subscriptionStatus = status; else body.subscriptionStatus = null;
    body.trialEndsAt = trialEndsAt ? new Date(`${trialEndsAt}T23:59:59`).toISOString() : null;

    const res = await fetch(`/api/platform/orgs/${org.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed");
      return;
    }
    setSavedAt(Date.now());
    r.refresh();
    setTimeout(() => setSavedAt(null), 2500);
  }

  async function deleteOrg() {
    const ok = await confirm({
      title: `Permanently delete ${org.name}?`,
      description: `This wipes the organization and EVERY record inside it (members, shifts, attendance, audit logs). There is NO undo. The slug "${org.slug}" will become available for reuse.`,
      tone: "danger",
      confirmLabel: "Delete forever",
    });
    if (!ok) return;
    setDeleting(true);
    const res = await fetch(`/api/platform/orgs/${org.id}?confirm=${encodeURIComponent(org.slug)}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
      return;
    }
    r.push("/platform/orgs");
    r.refresh();
  }

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Organization settings</h3>
        {savedAt && <span className="text-[11px] text-emerald-600">Saved ✓</span>}
      </header>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Industry</label>
            <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="free">Free · 5 seats · 1 location</option>
              <option value="pro">Pro · $29 + 5 seats + $4/seat</option>
              <option value="business">Business · $79 + 15 seats + $6/seat</option>
              <option value="enterprise">Enterprise · custom</option>
            </select>
          </div>
          <div>
            <label className="label">Subscription status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">— (no Stripe yet)</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
              <option value="incomplete">incomplete</option>
            </select>
          </div>
          <div>
            <label className="label">Trial ends on</label>
            <input className="input" type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
            <p className="text-[11px] text-ink-500 mt-1">Leave blank to clear the trial deadline.</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500" />
              <span>Demo org (excluded from real-customer counts)</span>
            </label>
          </div>
        </div>

        {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2.5 border border-rose-200 dark:border-rose-500/30">{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>

        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/10 p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-rose-900 dark:text-rose-200">Danger zone</h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">Permanently delete this org and every record it owns. There is no undo.</p>
              <button onClick={deleteOrg} disabled={deleting} className="mt-3 btn-outline border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 text-xs">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? "Deleting…" : "Delete organization"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
