"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, FileCheck2, Trash2, GripVertical } from "lucide-react";

type Q = { question: string; type: "scale" | "text" | "yesno" | "multiple_choice" };

const STARTER_TEMPLATES: { name: string; questions: Q[] }[] = [
  {
    name: "Pulse check (eNPS)",
    questions: [
      { question: "On a scale of 0-10, how likely are you to recommend working here to a friend?", type: "scale" },
      { question: "What's one thing we should keep doing?", type: "text" },
      { question: "What's one thing we should change?", type: "text" },
    ],
  },
  {
    name: "Schedule satisfaction",
    questions: [
      { question: "How happy are you with your schedule this month?", type: "scale" },
      { question: "Do you get enough advance notice for shift changes?", type: "yesno" },
      { question: "Any specific feedback?", type: "text" },
    ],
  },
  {
    name: "Blank slate",
    questions: [{ question: "", type: "scale" }],
  },
];

export function NewSurveyButton() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Q[]>([{ question: "", type: "scale" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(""); setDescription(""); setQuestions([{ question: "", type: "scale" }]);
    setError(null); setBusy(false);
  }

  function loadTemplate(t: typeof STARTER_TEMPLATES[number]) {
    setTitle(t.name);
    setQuestions(t.questions.map(q => ({ ...q })));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = questions.filter(q => q.question.trim().length >= 2);
    if (valid.length === 0) { setError("Add at least one question"); return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/surveys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        questions: valid,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOpen(false); reset();
    if (data.survey?.id) r.push(`/hr/surveys/${data.survey.id}`); else r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> New survey
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New survey</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto scroll-thin">
              <div>
                <label className="label">Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_TEMPLATES.map(t => (
                    <button type="button" key={t.name} onClick={() => loadTemplate(t)} className="btn-outline text-xs">{t.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Title *</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q1 pulse check" maxLength={140} required minLength={2} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anonymous · takes ~2 minutes" maxLength={1000} />
              </div>

              <div className="pt-2 border-t border-ink-100 dark:border-ink-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Questions</label>
                  <button type="button" onClick={() => setQuestions(qs => [...qs, { question: "", type: "scale" }])}
                    className="btn-outline text-xs">
                    <Plus className="w-3 h-3" /> Add question
                  </button>
                </div>
                <ul className="space-y-2">
                  {questions.map((q, i) => (
                    <li key={i} className="rounded-xl border border-ink-200 dark:border-ink-800 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-ink-400 mt-2.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <input className="input" value={q.question}
                            onChange={(e) => setQuestions(qs => qs.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                            placeholder={`Question ${i + 1}`}
                            maxLength={500}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <select className="input h-8 text-xs w-44" value={q.type}
                              onChange={(e) => setQuestions(qs => qs.map((x, j) => j === i ? { ...x, type: e.target.value as Q["type"] } : x))}>
                              <option value="scale">Scale 0–10</option>
                              <option value="text">Free text</option>
                              <option value="yesno">Yes / No</option>
                              <option value="multiple_choice">Multiple choice</option>
                            </select>
                            {questions.length > 1 && (
                              <button type="button" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}
                                aria-label="Remove question"
                                className="btn-ghost text-rose-600 text-xs">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || title.trim().length < 2} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                {busy ? "Creating…" : "Create survey"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
