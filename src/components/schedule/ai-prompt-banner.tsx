"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Wand2 } from "lucide-react";

/**
 * AI-first scheduling banner — sits above the schedule grid and reframes the
 * primary action as a chat prompt instead of a grid-edit task.
 *
 * Why: a non-technical manager looking at an empty week grid is paralyzed.
 * "Where do I click? What goes in each cell?" The grid is great as a refining
 * tool but terrible as a starting tool. Giving them a single text box that
 * accepts plain English ("I need 2 servers each shift Mon–Fri") lets the AI
 * draft the whole week, and then they refine the grid.
 *
 * The grid stays right below. Power users who prefer it just ignore this banner.
 *
 * Clicking the banner opens the global Cmd+K palette which routes free-form
 * input into the Co-pilot. The Co-pilot has tools to create shifts (so this
 * actually works end-to-end without extra wiring once the env key is set).
 */
export function AiPromptBanner({ aiConfigured = true }: { aiConfigured?: boolean }) {
  const [draft, setDraft] = useState("");

  function submit(prompt: string) {
    if (!prompt.trim()) return;
    // Stash the draft so the Co-pilot panel can pick it up. We re-dispatch
    // through the same ⌘K keyboard event the topbar listens for — this keeps
    // the integration zero-cost (no new props through the tree).
    sessionStorage.setItem("copilot:initialPrompt", prompt);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
  }

  if (!aiConfigured) {
    // Don't show a "powered by AI" promise when there's no key configured.
    // Hide entirely so we're not lying. The grid still works.
    return null;
  }

  const examples = [
    "2 servers, 1 host, 1 bartender each dinner shift Mon-Sat",
    "Same as last week but everyone off Sunday",
    "Open coverage for next Friday 9am-1pm",
  ];

  return (
    <section className="card p-4 bg-gradient-to-r from-brand-500/[0.06] via-purple-500/[0.04] to-rose-500/[0.06] border-brand-500/25">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-soft">
          <Wand2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-400 font-semibold">
              Faster way
            </span>
            <Sparkles className="w-3 h-3 text-brand-400" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(draft)}
              placeholder="Tell me what you need — &ldquo;2 servers each dinner shift Mon-Sat&rdquo;"
              className="flex-1 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] focus:border-brand-500/40 focus:outline-none text-sm placeholder:text-ink-500"
            />
            <button
              onClick={() => submit(draft)}
              disabled={!draft.trim()}
              className="btn-primary btn-sm disabled:opacity-40"
            >
              Draft my week <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => { setDraft(ex); submit(ex); }}
                className="text-[11px] text-ink-400 hover:text-brand-300 hover:bg-white/[0.04] px-2 py-1 rounded transition border border-white/[0.06]"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
