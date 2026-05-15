"use client";
import { useEffect, useRef, useState } from "react";
import { initials, relTime } from "@/lib/utils";
import { Send, Search, MessageCircle } from "lucide-react";

type Contact = { id: string; name: string; avatar: string | null; role: string; location?: string };
type Msg = { id: string; fromId: string; toId: string; body: string; createdAt: string };

export function MessengerClient({
  me, contacts, initialMessages,
}: { me: { id: string; name: string }; contacts: Contact[]; initialMessages: Msg[] }) {
  const [active, setActive] = useState<Contact | null>(contacts[0] ?? null);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const filteredContacts = contacts.filter(c =>
    !query.trim() ||
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.location ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const thread = active ? messages.filter(m => (m.fromId === me.id && m.toId === active.id) || (m.fromId === active.id && m.toId === me.id)) : [];

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [thread.length, active?.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: active.id, body: draft.trim() }),
    });
    if (res.ok) {
      const m = await res.json();
      setMessages(prev => [...prev, { ...m, createdAt: new Date(m.createdAt).toISOString() }]);
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-12rem)] min-h-[480px]">
      <aside className="border-r border-ink-200 dark:border-ink-800 overflow-y-auto scroll-thin bg-ink-50/30 dark:bg-ink-900/40">
        <div className="p-3 border-b border-ink-100 dark:border-ink-800 sticky top-0 bg-white dark:bg-ink-900 z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input h-9 pl-8 text-sm"
              placeholder="Search teammates"
            />
          </div>
        </div>
        <ul className="py-1">
          {filteredContacts.map(c => {
            const last = [...messages].reverse().find(m => (m.fromId === c.id && m.toId === me.id) || (m.toId === c.id && m.fromId === me.id));
            const isActive = active?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setActive(c)}
                  className={`w-full flex items-center gap-2.5 p-3 text-left transition relative
                    ${isActive
                      ? "bg-brand-50 dark:bg-brand-500/15 text-ink-900 dark:text-ink-50"
                      : "hover:bg-ink-100/80 dark:hover:bg-ink-800/70 text-ink-900 dark:text-ink-100"}`}
                >
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-brand-500" />}
                  {c.avatar
                    ? <img src={c.avatar} className="w-9 h-9 rounded-full ring-1 ring-ink-200 dark:ring-ink-700" alt="" />
                    : <div className="w-9 h-9 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-200 text-xs font-semibold flex items-center justify-center">{initials(c.name)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isActive ? "text-brand-700 dark:text-brand-200" : "text-ink-900 dark:text-ink-50"}`}>{c.name}</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400 truncate">{last?.body ?? c.location ?? c.role}</div>
                  </div>
                  {last && <div className="text-[10px] text-ink-400 dark:text-ink-500 shrink-0">{relTime(last.createdAt)}</div>}
                </button>
              </li>
            );
          })}
          {filteredContacts.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-ink-500 dark:text-ink-400">No teammates match &quot;{query}&quot;.</li>
          )}
        </ul>
      </aside>

      <section className="flex flex-col min-h-0 bg-white dark:bg-ink-950">
        {active ? (
          <>
            <header className="p-3 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2.5 bg-white dark:bg-ink-900">
              {active.avatar
                ? <img src={active.avatar} className="w-9 h-9 rounded-full ring-1 ring-ink-200 dark:ring-ink-700" alt="" />
                : <div className="w-9 h-9 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-200 text-xs font-semibold flex items-center justify-center">{initials(active.name)}</div>}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink-900 dark:text-ink-50">{active.name}</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">{active.role} · {active.location ?? "—"}</div>
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-thin space-y-2 bg-ink-50/40 dark:bg-ink-950">
              {thread.length === 0 && (
                <div className="text-center mt-12">
                  <div className="text-5xl mb-3">👋</div>
                  <div className="font-semibold text-ink-700 dark:text-ink-200">Say hi to {active.name.split(" ")[0]}</div>
                  <div className="text-xs text-ink-500 dark:text-ink-400 mt-1 max-w-xs mx-auto">No messages yet. Drop the first one — they&apos;ll get a notification.</div>
                </div>
              )}
              {thread.map(m => {
                const mine = m.fromId === me.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm
                      ${mine
                        ? "bg-brand-500 text-white rounded-br-md"
                        : "bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 rounded-bl-md border border-ink-100 dark:border-ink-700"}`}>
                      {m.body}
                      <div className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-ink-500 dark:text-ink-400"}`}>{relTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t border-ink-200 dark:border-ink-800 flex items-center gap-2 bg-white dark:bg-ink-900">
              <input
                className="input flex-1"
                placeholder={`Message ${active.name.split(" ")[0]}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button className="btn-primary" disabled={sending || !draft.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-500 dark:text-ink-400 text-sm flex-col gap-2">
            <MessageCircle className="w-8 h-8 text-ink-300 dark:text-ink-600" />
            <div>Pick a teammate to start chatting.</div>
          </div>
        )}
      </section>
    </div>
  );
}
