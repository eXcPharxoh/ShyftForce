"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Wand2, Loader2, ChevronRight, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

type ChatMsg = { role: "user" | "assistant"; content: string };
type TraceItem = { type: "text" | "tool"; name?: string; input?: any; output?: any; text?: string };

const SUGGESTIONS = [
  "What's pending my approval right now?",
  "Show me overtime by location this period",
  "Schedule Jordan and Aisha at yoko luna for Saturday 6pm-2am",
  "Find a replacement for the next open shift",
  "Send Sarah a high-five for covering last week",
  "How many hours has each employee worked this period?",
];

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [traces, setTraces] = useState<Record<number, TraceItem[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  async function send(text?: string) {
    const body = (text ?? draft).trim();
    if (!body || loading) return;
    setDraft("");
    const next: ChatMsg[] = [...messages, { role: "user", content: body }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...next, { role: "assistant", content: `⚠️ ${data.error ?? "Something went wrong."}` }]);
      } else {
        const idx = next.length;
        setMessages([...next, { role: "assistant", content: data.text || "(no text returned)" }]);
        setTraces(t => ({ ...t, [idx]: data.trace ?? [] }));
        const mutated = (data.trace ?? []).some((t: any) => t.type === "tool" && /create|publish|update|send_/.test(t.name ?? ""));
        if (mutated) router.refresh();
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `⚠️ Network error: ${e.message ?? e}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink-900/30 backdrop-blur-[1px] z-40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl border-l border-ink-200 z-50 flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="px-4 h-14 border-b border-ink-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-none">Co-pilot</div>
            <div className="text-[11px] text-ink-500 mt-0.5">Powered by Claude</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-thin space-y-4">
          {messages.length === 0 && (
            <div>
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center mx-auto mb-3">
                  <Wand2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg">How can I help?</h3>
                <p className="text-sm text-ink-500 mt-1">Schedule shifts, pull reports, send kudos — just ask.</p>
              </div>
              <div className="space-y-2 mt-4">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s} onClick={() => send(s)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-xl border border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 flex items-center gap-2 group"
                  >
                    <span className="text-ink-400 group-hover:text-brand-500"><ChevronRight className="w-4 h-4" /></span>
                    <span className="flex-1">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-brand-500 text-white rounded-br-md" : "bg-ink-50 text-ink-900 rounded-bl-md"}`}>
                {renderMarkdown(m.content)}
                {m.role === "assistant" && traces[i]?.some(t => t.type === "tool") && (
                  <ToolTrace items={traces[i].filter(t => t.type === "tool")} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-ink-50 text-ink-700 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="p-3 border-t border-ink-200 flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            className="input flex-1 resize-none min-h-[40px] max-h-32"
            rows={1}
            placeholder="Ask me anything…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button type="submit" disabled={loading || !draft.trim()} className="btn-primary h-10">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </>
  );
}

function ToolTrace({ items }: { items: TraceItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const tools = items.filter(t => t.type === "tool");
  if (!tools.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-ink-200">
      <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-ink-500 hover:text-ink-700 flex items-center gap-1">
        <Wrench className="w-3 h-3" /> {tools.length} tool call{tools.length === 1 ? "" : "s"} {expanded ? "▾" : "▸"}
      </button>
      {expanded && (
        <ul className="mt-1.5 space-y-1 text-[11px]">
          {tools.map((t, i) => (
            <li key={i} className="font-mono text-ink-600">
              <span className="text-brand-600 font-semibold">{t.name}</span>
              <span className="text-ink-400">({Object.keys(t.input ?? {}).join(", ") || "—"})</span>
              {t.output?.error && <div className="text-rose-600 ml-3">→ error: {t.output.error}</div>}
              {!t.output?.error && <div className="text-emerald-700 ml-3">→ ok</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tiny markdown — bold + bullet lists only (no full md parser to keep it light)
function renderMarkdown(s: string) {
  const lines = s.split("\n");
  return lines.map((line, i) => {
    const isBullet = /^\s*[-•*]\s+/.test(line);
    const content = line
      .replace(/^\s*[-•*]\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`(.+?)`/g, '<code class="bg-ink-200/60 px-1 rounded">$1</code>');
    return isBullet
      ? <div key={i} className="flex gap-2 ml-1"><span>•</span><span dangerouslySetInnerHTML={{ __html: content }} /></div>
      : <div key={i} dangerouslySetInnerHTML={{ __html: content }} />;
  });
}
