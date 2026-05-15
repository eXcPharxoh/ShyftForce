"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJIS = ["🙌","⭐","🔥","💪","🎯","🎉","🏆","💯"];

export function KudosForm({ members }: { members: { id: string; name: string }[] }) {
  const r = useRouter();
  const [toId, setToId] = useState(members[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("🙌");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await fetch("/api/kudos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId, message, emoji }),
    });
    setLoading(false); setMessage(""); r.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <label className="label">To</label>
        <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="input min-h-[88px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What did they crush today?" required />
      </div>
      <div>
        <label className="label">Vibe</label>
        <div className="flex gap-1.5">
          {EMOJIS.map(e => (
            <button type="button" key={e} onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-lg border transition ${emoji === e ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15" : "border-ink-200 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800"} text-lg`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <button className="btn-primary w-full" disabled={loading || !message.trim()}>{loading ? "Sending…" : "Send high five"}</button>
    </form>
  );
}
