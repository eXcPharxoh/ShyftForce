"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, Plus, X, Loader2, Trash2, Link as LinkIcon, ExternalLink,
  Users, Check, Lock, FileText,
} from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Posting = {
  id: string;
  title: string;
  description: string | null;
  position: string | null;
  status: "draft" | "open" | "closed";
  employmentType: string;
  payMin: number | null;
  payMax: number | null;
  payPeriod: string;
  locationId: string | null;
  locationName: string | null;
  ownerName: string | null;
  publicToken: string;
  startDate: string | null;
  createdAt: string;
  totalApplications: number;
  byStatus: Record<string, number>;
};

const PIPELINE = [
  { key: "new",       label: "New" },
  { key: "screen",    label: "Screen" },
  { key: "interview", label: "Interview" },
  { key: "offer",     label: "Offer" },
  { key: "hired",     label: "Hired" },
  { key: "rejected",  label: "Rejected" },
];

const EMPLOYMENT = [
  { v: "part_time", l: "Part-time" },
  { v: "full_time", l: "Full-time" },
  { v: "contract",  l: "Contract" },
  { v: "seasonal",  l: "Seasonal" },
];

export function JobsClient({
  initial, locations,
}: {
  initial: Posting[];
  locations: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState("");
  const [employmentType, setEmploymentType] = useState("part_time");
  const [payMin, setPayMin] = useState<string>("");
  const [payMax, setPayMax] = useState<string>("");
  const [payPeriod, setPayPeriod] = useState("hour");
  const [locId, setLocId] = useState("");
  const [startDate, setStartDate] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        position: position.trim() || null,
        employmentType,
        payMin: payMin ? Number(payMin) : null,
        payMax: payMax ? Number(payMax) : null,
        payPeriod,
        locationId: locId || null,
        startDate: startDate || null,
        status: "open",
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false);
    setTitle(""); setDescription(""); setPosition("");
    setPayMin(""); setPayMax(""); setLocId(""); setStartDate("");
    r.refresh();
  }

  async function setStatus(p: Posting, status: "open" | "closed" | "draft") {
    const res = await fetch(`/api/jobs/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
  }

  async function remove(p: Posting) {
    const ok = await confirm({
      title: `Delete "${p.title}"?`,
      description: p.totalApplications > 0
        ? "This posting has applications — close it instead to keep the candidate history."
        : "This posting has no applications and will be permanently deleted.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await fetch(`/api/jobs/${p.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { window.alert(d.error ?? "Delete failed"); return; }
    setItems(prev => prev.filter(x => x.id !== p.id));
  }

  function publicUrl(token: string) {
    if (typeof window === "undefined") return `/apply/${token}`;
    return `${window.location.origin}/apply/${token}`;
  }

  async function copyLink(p: Posting) {
    try {
      await navigator.clipboard.writeText(publicUrl(p.publicToken));
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* swallow */ }
  }

  function payLabel(p: Posting) {
    if (p.payMin == null && p.payMax == null) return null;
    const suffix = p.payPeriod === "year" ? "/yr" : p.payPeriod === "week" ? "/wk" : "/hr";
    if (p.payMin != null && p.payMax != null) return `$${p.payMin.toFixed(0)}–$${p.payMax.toFixed(0)}${suffix}`;
    if (p.payMin != null) return `From $${p.payMin.toFixed(0)}${suffix}`;
    return `Up to $${p.payMax!.toFixed(0)}${suffix}`;
  }

  function statusPill(s: string) {
    if (s === "open")   return "status-success";
    if (s === "draft")  return "status-warn";
    return "status-mute";
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] text-ink-500 font-mono">
          {items.length} posting{items.length === 1 ? "" : "s"} ·
          {" "}{items.filter(p => p.status === "open").length} open ·
          {" "}{items.reduce((a, p) => a + p.totalApplications, 0)} total applications
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> New posting
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No job postings yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Post your first role. Share the link on Indeed, Craigslist, social — applications come right back here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(p => (
            <li key={p.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/hr/jobs/${p.id}`} className="text-[15px] font-semibold text-ink-50 hover:text-brand-300 transition">
                      {p.title}
                    </Link>
                    <span className={`status ${statusPill(p.status)}`}>{p.status}</span>
                    {p.position && <span className="status status-mute">{p.position}</span>}
                  </div>
                  <div className="text-[12px] text-ink-300 mt-1 font-mono flex items-center gap-2 flex-wrap">
                    {EMPLOYMENT.find(e => e.v === p.employmentType)?.l ?? p.employmentType}
                    {payLabel(p) && <span>· {payLabel(p)}</span>}
                    {p.locationName && <span>· {p.locationName}</span>}
                    {p.ownerName && <span>· Owned by {p.ownerName}</span>}
                  </div>

                  {/* Pipeline counts */}
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {PIPELINE.filter(s => (p.byStatus[s.key] ?? 0) > 0).length === 0 ? (
                      <span className="text-[11px] text-ink-500">No applicants yet</span>
                    ) : (
                      PIPELINE.map(s => {
                        const n = p.byStatus[s.key] ?? 0;
                        if (n === 0) return null;
                        return (
                          <Link
                            key={s.key}
                            href={`/hr/jobs/${p.id}?stage=${s.key}`}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-white/[0.08] bg-white/[0.02] hover:border-brand-500/40 hover:text-brand-300 transition"
                          >
                            <span className="text-ink-500">{s.label}</span>{" "}
                            <span className="text-ink-50 font-bold">{n}</span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {p.status === "open" && (
                    <button
                      onClick={() => copyLink(p)}
                      className="btn-ghost btn-sm"
                      title="Copy public apply link"
                    >
                      {copied === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      {copied === p.id ? "Copied!" : "Copy link"}
                    </button>
                  )}
                  {p.status === "open" && (
                    <a
                      href={publicUrl(p.publicToken)}
                      target="_blank" rel="noopener noreferrer"
                      className="btn-ghost btn-sm"
                      title="Preview public page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </a>
                  )}
                  <Link href={`/hr/jobs/${p.id}`} className="btn-ghost btn-sm">
                    <Users className="w-3.5 h-3.5" /> Review {p.totalApplications}
                  </Link>
                  {p.status === "open" ? (
                    <button onClick={() => setStatus(p, "closed")} className="btn-ghost btn-sm" title="Close posting">
                      <Lock className="w-3.5 h-3.5" /> Close
                    </button>
                  ) : (
                    <button onClick={() => setStatus(p, "open")} className="btn-ghost btn-sm" title="Reopen posting">
                      <FileText className="w-3.5 h-3.5" /> Reopen
                    </button>
                  )}
                  <button onClick={() => remove(p)} aria-label="Delete" className="btn-ghost btn-sm text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-ink-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <header className="px-5 h-14 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New job posting</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-white/[0.04]">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required maxLength={120}
                  placeholder="Line cook · Weekend server · Floor manager"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Position / role</label>
                  <input
                    className="input"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    maxLength={80}
                    placeholder="Server, Cook, Cashier…"
                  />
                </div>
                <div>
                  <label className="label">Employment type</label>
                  <select className="input" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                    {EMPLOYMENT.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Pay min</label>
                  <input
                    className="input"
                    type="number" step="0.01" min="0"
                    value={payMin}
                    onChange={(e) => setPayMin(e.target.value)}
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="label">Pay max</label>
                  <input
                    className="input"
                    type="number" step="0.01" min="0"
                    value={payMax}
                    onChange={(e) => setPayMax(e.target.value)}
                    placeholder="24"
                  />
                </div>
                <div>
                  <label className="label">Per</label>
                  <select className="input" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)}>
                    <option value="hour">Hour</option>
                    <option value="week">Week</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    <option value="">Any / unspecified</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={8000}
                  placeholder="What does this role do? What does a great day look like? What's the schedule?"
                />
              </div>

              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>

            <footer className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !title.trim()} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Post job
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
