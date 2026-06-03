"use client";

import { Sparkles, ArrowUpRight } from "lucide-react";

/**
 * Small "Stuck? Ask the AI" link that any page can drop near a complex
 * form section. Clicking it stashes a pre-filled prompt in sessionStorage
 * and triggers the global ⌘K handler in the topbar, which then opens the
 * Co-pilot panel with the prompt already loaded.
 *
 * Use this everywhere a non-technical user might look at a form and think
 * "what does this even mean?" — compliance settings, PTO accrual rules,
 * shift differentials, anywhere with jargon.
 *
 * Three sizes:
 *   - "inline" (default): a tiny one-liner that fits next to a section heading
 *   - "card": a full-width prompt card for an empty page state
 *   - "tooltip-style": a subtle hint next to a single field
 */
export function AskAiHint({
  prompt,
  label = "Stuck? Ask the assistant",
  variant = "inline",
}: {
  /** What to pre-fill the Co-pilot with. e.g. "Help me set up overtime rules." */
  prompt: string;
  label?: string;
  variant?: "inline" | "card" | "tooltip-style";
}) {
  function open() {
    sessionStorage.setItem("copilot:initialPrompt", prompt);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
  }

  if (variant === "card") {
    return (
      <button
        onClick={open}
        className="w-full card p-4 hover:border-brand-500/40 transition flex items-center gap-3 text-left bg-gradient-to-r from-brand-500/[0.06] to-purple-500/[0.06] border-brand-500/25"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            The assistant can explain what this does and set it up for you.
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-ink-500 shrink-0" />
      </button>
    );
  }

  if (variant === "tooltip-style") {
    return (
      <button
        onClick={open}
        className="text-[11px] text-ink-500 hover:text-brand-300 inline-flex items-center gap-1 transition"
      >
        <Sparkles className="w-3 h-3" />
        {label}
      </button>
    );
  }

  // inline (default)
  return (
    <button
      onClick={open}
      className="text-[12px] text-brand-400 hover:text-brand-300 inline-flex items-center gap-1.5 transition group"
    >
      <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
      {label}
    </button>
  );
}
