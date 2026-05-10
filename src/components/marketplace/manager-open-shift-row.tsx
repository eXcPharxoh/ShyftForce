"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Wand2, ChevronDown, ChevronUp, Send, Loader2, X } from "lucide-react";
import { initials, dateLabel, timeLabel } from "@/lib/utils";

type OfferLite = {
  id: string; memberId: string; name: string; avatar: string | null;
  wave: number; status: string; expiresAt: string; respondedAt: string | null;
};
type ShiftLite = { id: string; position: string | null; locationName: string; startsAt: string; endsAt: string };

type Candidate = {
  id: string; name: string; position: string | null; score: number;
  weeklyHoursCurrent: number; reasons: string[]; rationale: string; conflict: string | null; alreadyOffered?: boolean;
};

const WAVE_LABEL: Record<number, string> = { 1: "Wave 1 (Top 3)", 2: "Wave 2 (Broaden +5)", 3: "Wave 3 (All eligible)" };

export function ManagerOpenShiftRow({ shift, offers }: { shift: ShiftLite; offers: OfferLite[] }) {
  const r = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const lastWave = offers.reduce((a, o) => Math.max(a, o.wave), 0);
  const pendingCount = offers.filter(o => o.status === "pending").length;
  const claimed = offers.find(o => o.status === "claimed");

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{shift.position ?? "Shift"} · {shift.locationName}</div>
          <div className="text-[11px] text-ink-500">{dateLabel(shift.startsAt)} · {timeLabel(shift.startsAt)} – {timeLabel(shift.endsAt)}</div>
        </div>
        <div className="text-right text-[11px] text-ink-500 mr-2">
          {lastWave > 0 ? <>Wave {lastWave} sent · {pendingCount} pending</> : <span className="text-amber-700 font-medium">No offers yet</span>}
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-outline text-xs border-brand-300 text-brand-700">
          <Wand2 className="w-4 h-4" /> {lastWave === 0 ? "Auto-offer" : `Send Wave ${lastWave + 1}`}
        </button>
        {offers.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost text-xs">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && offers.length > 0 && (
        <div className="mt-2 ml-13 pl-13 space-y-1">
          <div className="text-[11px] uppercase text-ink-500 font-medium pl-1">Offer history</div>
          <ul className="text-xs space-y-1">
            {offers.sort((a,b) => a.wave - b.wave || a.name.localeCompare(b.name)).map(o => (
              <li key={o.id} className="flex items-center gap-2 px-1">
                <span className="badge-gray">W{o.wave}</span>
                <span>{o.name}</span>
                <span className="text-ink-400">·</span>
                <StatusBadge status={o.status} />
                {o.status === "pending" && <span className="text-ink-500">expires {new Date(o.expiresAt).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",month:"short",day:"numeric"})}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <AutoOfferModal
          shift={shift}
          nextWave={(Math.min(3, lastWave + 1) as 1 | 2 | 3)}
          onClose={() => setModalOpen(false)}
          onSent={() => { setModalOpen(false); r.refresh(); }}
        />
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "claimed")    return <span className="badge bg-emerald-50 text-emerald-700">Claimed</span>;
  if (status === "pending")    return <span className="badge bg-amber-50 text-amber-700">Pending</span>;
  if (status === "declined")   return <span className="badge bg-rose-50 text-rose-700">Declined</span>;
  if (status === "expired")    return <span className="badge bg-ink-100 text-ink-700">Expired</span>;
  if (status === "superseded") return <span className="badge bg-ink-100 text-ink-600">Superseded</span>;
  return <span className="badge-gray">{status}</span>;
}

function AutoOfferModal({
  shift, nextWave, onClose, onSent,
}: { shift: ShiftLite; nextWave: 1 | 2 | 3; onClose: () => void; onSent: () => void }) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wave, setWave] = useState<1 | 2 | 3>(nextWave);

  // Load ranked candidates once on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shifts/${shift.id}/auto-offer`).then(r => r.json()).then(d => {
      if (cancelled) return;
      if (d.error) { setError(d.error); setLoading(false); return; }
      const cs: Candidate[] = d.candidates ?? [];
      setCandidates(cs);
      const planSize = wave === 1 ? 3 : wave === 2 ? 5 : 99;
      setSelected(new Set(cs.slice(0, planSize).map(c => c.id)));
      setLoading(false);
    }).catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shift.id]);

  async function send() {
    setSending(true); setError(null);
    const res = await fetch(`/api/shifts/${shift.id}/auto-offer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wave, candidateIds: [...selected] }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    onSent();
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="px-5 h-14 border-b border-ink-200 flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center"><Wand2 className="w-4 h-4" /></div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-none">Auto-offer this shift</div>
            <div className="text-[11px] text-ink-500 mt-0.5">{shift.position ?? "Shift"} · {shift.locationName} · {dateLabel(shift.startsAt)} {timeLabel(shift.startsAt)}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-4 border-b border-ink-100 flex items-center gap-3">
          <label className="text-xs font-medium text-ink-700">Wave:</label>
          {[1,2,3].map((w) => (
            <button key={w} onClick={() => setWave(w as 1 | 2 | 3)}
              className={`text-xs px-3 py-1.5 rounded-full border ${wave === w ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>
              {WAVE_LABEL[w]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {loading && <div className="p-12 flex flex-col items-center"><Loader2 className="w-6 h-6 animate-spin text-ink-400" /><div className="text-xs text-ink-500 mt-2">Ranking candidates…</div></div>}
          {error && !loading && <div className="p-6 text-rose-600 text-sm">{error}</div>}
          {!loading && !error && candidates.length === 0 && <div className="p-12 text-center text-sm text-ink-500">No eligible candidates.</div>}
          {!loading && !error && candidates.length > 0 && (
            <ul className="divide-y divide-ink-100">
              {candidates.map((c, i) => (
                <li key={c.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-ink-50/40">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="w-7 h-7 rounded-full bg-ink-200 text-[11px] font-semibold flex items-center justify-center">{initials(c.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {c.name}
                      <span className="text-ink-500 font-normal"> · {c.position ?? "—"}</span>
                      {i < 3 && <span className="badge-orange ml-2">Top {i+1}</span>}
                    </div>
                    <div className="text-[11px] text-ink-500 truncate">{c.rationale}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold tabular-nums">{c.score.toFixed(0)}</div>
                    <div className="text-ink-400">score</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-ink-200 p-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-ink-500">{selected.size} selected · they'll get a DM with the offer</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={send} disabled={sending || selected.size === 0} className="btn-primary">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send {selected.size} offer{selected.size === 1 ? "" : "s"}</>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
