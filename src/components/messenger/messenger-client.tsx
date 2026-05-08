"use client";
import { useEffect, useRef, useState } from "react";
import { initials, relTime } from "@/lib/utils";
import { Send } from "lucide-react";

type Contact = { id: string; name: string; avatar: string | null; role: string; location?: string };
type Msg = { id: string; fromId: string; toId: string; body: string; createdAt: string };

export function MessengerClient({
  me, contacts, initialMessages,
}: { me: { id: string; name: string }; contacts: Contact[]; initialMessages: Msg[] }) {
  const [active, setActive] = useState<Contact | null>(contacts[0] ?? null);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100vh-7.5rem)]">
      <aside className="border-r border-ink-200 overflow-y-auto scroll-thin">
        <div className="p-3 border-b border-ink-100">
          <input className="input h-9" placeholder="Search teammates" />
        </div>
        <ul>
          {contacts.map(c => {
            const last = [...messages].reverse().find(m => (m.fromId === c.id && m.toId === me.id) || (m.toId === c.id && m.fromId === me.id));
            const isActive = active?.id === c.id;
            return (
              <li key={c.id}>
                <button onClick={() => setActive(c)} className={`w-full flex items-center gap-2.5 p-3 hover:bg-ink-50 text-left ${isActive ? "bg-brand-50" : ""}`}>
                  {c.avatar ? <img src={c.avatar} className="w-9 h-9 rounded-full" alt="" /> : <div className="w-9 h-9 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(c.name)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-ink-500 truncate">{last?.body ?? c.location ?? c.role}</div>
                  </div>
                  {last && <div className="text-[10px] text-ink-400">{relTime(last.createdAt)}</div>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex flex-col min-h-0">
        {active ? (
          <>
            <header className="p-3 border-b border-ink-200 flex items-center gap-2.5">
              {active.avatar ? <img src={active.avatar} className="w-9 h-9 rounded-full" alt="" /> : <div className="w-9 h-9 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(active.name)}</div>}
              <div className="min-w-0">
                <div className="text-sm font-semibold">{active.name}</div>
                <div className="text-[11px] text-ink-500">{active.role} · {active.location ?? "—"}</div>
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-thin space-y-2">
              {thread.length === 0 && <div className="text-xs text-ink-500 text-center mt-8">Start the conversation. Say hi 👋</div>}
              {thread.map(m => {
                const mine = m.fromId === me.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-brand-500 text-white rounded-br-md" : "bg-ink-100 text-ink-900 rounded-bl-md"}`}>
                      {m.body}
                      <div className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-ink-500"}`}>{relTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t border-ink-200 flex items-center gap-2">
              <input className="input flex-1" placeholder={`Message ${active.name.split(" ")[0]}…`} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className="btn-primary" disabled={sending || !draft.trim()}><Send className="w-4 h-4" /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">Pick a teammate to start chatting.</div>
        )}
      </section>
    </div>
  );
}
