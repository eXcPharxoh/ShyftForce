"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Loader2, Plus, X, Trash2, Camera, Check } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Task = {
  id: string; name: string; description: string | null;
  dueDate: string | null; requirePhoto: boolean; status: string;
  assignedToName: string | null; assignedToMemberId: string | null;
  lastSubmission: { memberName: string; photoData: string | null; notes: string | null; submittedAt: string } | null;
};

const STATUS_TONE: Record<string, string> = {
  open:      "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  done:      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  overdue:   "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cancelled: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
};

export function VmTasksClient({
  isManager, myMemberId, initial, members, locations,
}: {
  isManager: boolean;
  myMemberId: string | null;
  initial: Task[];
  members: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [assignedTo, setAssignedTo] = useState("");
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submitFor, setSubmitFor] = useState<Task | null>(null);
  const [subPhoto, setSubPhoto] = useState<string | null>(null);
  const [subNotes, setSubNotes] = useState("");

  const [photoView, setPhotoView] = useState<string | null>(null);

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/vm-tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        requirePhoto,
        assignedToMemberId: assignedTo || null,
        locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setDescription(""); setDueDate(""); r.refresh();
  }

  async function remove(t: Task) {
    const ok = await confirm({ title: `Delete "${t.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/vm-tasks/${t.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== t.id));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1024;
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setSubPhoto(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  }

  async function submitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!submitFor) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/vm-tasks/${submitFor.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoData: subPhoto, notes: subNotes.trim() || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setSubmitFor(null); setSubPhoto(null); setSubNotes(""); r.refresh();
  }

  function fmtDue(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <div className="flex justify-end">
          <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New task</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No VM tasks yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">{isManager ? "Create an endcap or display task and assign it to a team member." : "No tasks assigned to you right now."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(t => (
            <li key={t.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${STATUS_TONE[t.status] ?? STATUS_TONE.open} flex items-center justify-center shrink-0`}>
                  {t.status === "done" ? <Check className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.name}
                    <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[t.status] ?? STATUS_TONE.open}`}>{t.status}</span>
                    {t.requirePhoto && <span className="ml-1 text-[10px] text-ink-500">📸</span>}
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    {t.assignedToName ? `Assigned: ${t.assignedToName}` : "Unassigned"}
                    {t.dueDate && ` · Due ${fmtDue(t.dueDate)}`}
                  </div>
                  {t.description && <div className="text-[11px] text-ink-500 mt-0.5">{t.description}</div>}
                  {t.lastSubmission && (
                    <div className="text-[11px] text-emerald-600 mt-0.5">
                      ✓ Done by {t.lastSubmission.memberName} {new Date(t.lastSubmission.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {t.lastSubmission.photoData && (
                        <button onClick={() => setPhotoView(t.lastSubmission!.photoData!)} className="ml-2 underline">View photo</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {t.status === "open" && (!isManager ? (t.assignedToMemberId === myMemberId || !t.assignedToMemberId) : true) && (
                    <button onClick={() => { setSubmitFor(t); setSubPhoto(null); setSubNotes(""); }} className="btn-outline text-xs"><Camera className="w-3.5 h-3.5" /> Submit</button>
                  )}
                  {isManager && (
                    <button onClick={() => remove(t)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submitTask} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New VM task</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Task *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Set up summer endcap" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="3-tier display, hero SKU on top, plan-o-gram attached…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Due date</label>
                  <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Assign to</label>
                  <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={requirePhoto} onChange={(e) => setRequirePhoto(e.target.checked)} className="w-4 h-4" />
                Require photo proof
              </label>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Submit completion */}
      {submitFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setSubmitFor(null)}>
          <form onSubmit={submitProof} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Submit: {submitFor.name}</span></div>
              <button type="button" onClick={() => setSubmitFor(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              {submitFor.requirePhoto && (
                <div>
                  <label className="label">Photo {submitFor.requirePhoto && "*"}</label>
                  {subPhoto ? (
                    <div className="relative">
                      <img src={subPhoto} alt="Proof" className="rounded-xl max-h-64 w-auto" />
                      <button type="button" onClick={() => setSubPhoto(null)} className="absolute top-2 right-2 bg-white/90 dark:bg-ink-900/90 rounded-full p-1.5 shadow"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className="btn-outline text-sm cursor-pointer inline-flex">
                      <Camera className="w-4 h-4" /> Take photo
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                    </label>
                  )}
                </div>
              )}
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={subNotes} onChange={(e) => setSubNotes(e.target.value)} maxLength={1000} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setSubmitFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || (submitFor.requirePhoto && !subPhoto)} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark done
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Photo viewer */}
      {photoView && (
        <div className="fixed inset-0 z-50 bg-ink-950/90 flex items-center justify-center p-4" onClick={() => setPhotoView(null)}>
          <img src={photoView} alt="Submission" className="max-h-[90vh] max-w-[95vw] rounded-2xl" />
        </div>
      )}
    </div>
  );
}
