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

export function CopilotPanel({ open, onClose, initialPrompt }: { open: boolean; onClose: () => void; initialPrompt?: string }) {
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

  // When opened with a prefilled prompt (from the ⌘K palette), kick it off
  // automatically. We use a ref to ensure each prompt only fires once.
  const lastFiredPrompt = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!open || !initialPrompt) return;
    if (lastFiredPrompt.current === initialPrompt) return;
    lastFiredPrompt.current = initialPrompt;
    void send(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt]);

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

    // Stream the response via Server-Sent Events. The new /api/copilot/stream
    // endpoint sends `delta` events for text chunks, `tool` for tool calls,
    // and `done` / `error` as terminal events.
    const idx = next.length;
    setMessages(m => [...m, { role: "assistant", content: "" }]); // empty placeholder we'll fill
    const traceAcc: any[] = [];

    try {
      const res = await fetch("/api/copilot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "Stream error");
        setMessages(m => {
          const copy = [...m];
          copy[idx] = { role: "assistant", content: `⚠️ ${err}` };
          return copy;
        });
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const events = buf.split("\n\n");
        buf = events.pop() ?? ""; // keep the trailing partial

        for (const block of events) {
          const lines = block.split("\n");
          let eventName = "message";
          let dataLine = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) eventName = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataLine += ln.slice(5).trim();
          }
          if (!dataLine) continue;
          let payload: any;
          try { payload = JSON.parse(dataLine); } catch { continue; }

          if (eventName === "delta") {
            acc += payload.text ?? "";
            setMessages(m => {
              const copy = [...m];
              copy[idx] = { role: "assistant", content: acc };
              return copy;
            });
          } else if (eventName === "tool") {
            traceAcc.push({ type: "tool", name: payload.name, input: payload.input });
            setTraces(t => ({ ...t, [idx]: [...traceAcc] }));
          } else if (eventName === "done") {
            if (payload.trace) setTraces(t => ({ ...t, [idx]: payload.trace }));
            const finalText = (payload.text ?? acc).trim() || "(no text returned)";
            setMessages(m => {
              const copy = [...m];
              copy[idx] = { role: "assistant", content: finalText };
              return copy;
            });
            const mutated = (payload.trace ?? []).some((t: any) => t.type === "tool" && /create|publish|update|send_|cancel_|approve_|invite_|book_|log_|set_/.test(t.name ?? ""));
            if (mutated) router.refresh();
          } else if (eventName === "error") {
            setMessages(m => {
              const copy = [...m];
              copy[idx] = { role: "assistant", content: `⚠️ ${payload.message ?? "Stream error"}` };
              return copy;
            });
          }
        }
      }
    } catch (e: any) {
      setMessages(m => {
        const copy = [...m];
        copy[idx] = { role: "assistant", content: `⚠️ Network error: ${e.message ?? e}` };
        return copy;
      });
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
        className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white dark:bg-ink-900 shadow-2xl border-l border-ink-200 dark:border-ink-800 z-50 flex flex-col transition-transform duration-200 text-ink-900 dark:text-ink-50 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="px-4 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-none">Co-pilot</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Powered by Claude</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400" aria-label="Close">
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
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Schedule shifts, pull reports, send kudos — just ask.</p>
              </div>
              <div className="space-y-2 mt-4">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s} onClick={() => send(s)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50/40 dark:hover:bg-brand-500/10 flex items-center gap-2 group transition"
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
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-brand-500 text-white rounded-br-md" : "bg-ink-50 dark:bg-ink-800 text-ink-900 dark:text-ink-100 rounded-bl-md"}`}>
                {renderMarkdown(m.content)}
                {m.role === "assistant" && traces[i]?.some(t => t.type === "tool") && (
                  <ToolTrace items={traces[i].filter(t => t.type === "tool")} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-ink-50 dark:bg-ink-800 text-ink-700 dark:text-ink-300 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="p-3 border-t border-ink-200 dark:border-ink-800 flex items-end gap-2"
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
    <div className="mt-2 pt-2 border-t border-ink-200 dark:border-ink-700">
      <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 flex items-center gap-1">
        <Wrench className="w-3 h-3" /> {tools.length} tool call{tools.length === 1 ? "" : "s"} {expanded ? "▾" : "▸"}
      </button>
      {expanded && (
        <ul className="mt-1.5 space-y-1 text-[11px]">
          {tools.map((t, i) => (
            <li key={i} className="font-mono text-ink-600 dark:text-ink-400">
              <span className="text-brand-600 dark:text-brand-400 font-semibold">{t.name}</span>
              <span className="text-ink-400 dark:text-ink-500">({Object.keys(t.input ?? {}).join(", ") || "—"})</span>
              {t.output?.error && <div className="text-rose-600 dark:text-rose-400 ml-3">→ error: {t.output.error}</div>}
              {!t.output?.error && <div className="text-emerald-700 dark:text-emerald-300 ml-3">→ ok</div>}
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
      .replace(/`(.+?)`/g, '<code class="bg-ink-200/60 dark:bg-ink-700/60 px-1 rounded">$1</code>');
    return isBullet
      ? <div key={i} className="flex gap-2 ml-1"><span>•</span><span dangerouslySetInnerHTML={{ __html: content }} /></div>
      : <div key={i} dangerouslySetInnerHTML={{ __html: content }} />;
  });
}
