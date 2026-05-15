"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Megaphone } from "lucide-react";

const CATEGORIES = [
  { v: "general",      l: "General",     emoji: "📣" },
  { v: "schedule",     l: "Schedule",    emoji: "📅" },
  { v: "policy",       l: "Policy",      emoji: "📋" },
  { v: "celebration",  l: "Celebration", emoji: "🎉" },
  { v: "alert",        l: "Alert",       emoji: "🚨" },
] as const;

export function NewPostButton() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]["v"]>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() { setTitle(""); setBody(""); setCategory("general"); setError(null); setBusy(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/billboard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOpen(false); reset(); r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> New post
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New announcement</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Title *</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Schedule update for next week" maxLength={140} required minLength={2} />
              </div>
              <div>
                <label className="label">Category</label>
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button type="button" key={c.v} onClick={() => setCategory(c.v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${category === c.v
                        ? "bg-brand-500 text-white"
                        : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700"}`}>
                      {c.emoji} {c.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea
                  className="input min-h-[140px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What's the news? Markdown-style line breaks are preserved."
                  maxLength={8000}
                  required
                  minLength={2}
                />
                <p className="text-[11px] text-ink-500 mt-1">{8000 - body.length} characters left.</p>
              </div>
              {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || title.trim().length < 2 || body.trim().length < 2} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                {busy ? "Publishing…" : "Publish"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
