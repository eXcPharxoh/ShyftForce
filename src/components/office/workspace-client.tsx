"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Armchair, Video, PenLine, X, Loader2, Plus, Check } from "lucide-react";

type Desk = {
  id: string; name: string; zone: string | null;
  hasMonitor: boolean; hasStanding: boolean;
  bookings: { id: string; halfDay: string; memberName: string; memberId: string }[];
};
type Room = {
  id: string; name: string; capacity: number;
  hasVideo: boolean; hasWhiteboard: boolean;
  bookings: { id: string; title: string; startsAt: string; endsAt: string; organizerName: string; organizerId: string }[];
};

export function WorkspaceClient({
  myMemberId, todayKey, desks, rooms, allMembers,
}: {
  myMemberId: string | null;
  todayKey: string;
  desks: Desk[];
  rooms: Room[];
  allMembers: { id: string; name: string }[];
}) {
  const r = useRouter();
  const [tab, setTab] = useState<"desks" | "rooms">("desks");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hot-desk booking
  const [bookingDesk, setBookingDesk] = useState<Desk | null>(null);
  const [halfDay, setHalfDay] = useState<"am" | "pm" | "full">("full");

  // Room booking
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [rtitle, setRtitle] = useState("");
  const [rstart, setRstart] = useState("09:00");
  const [rend, setRend]     = useState("10:00");

  async function bookDesk(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingDesk) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/hot-desk-bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotDeskId: bookingDesk.id, date: todayKey, halfDay }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setBookingDesk(null); r.refresh();
  }

  async function cancelDesk(bookingId: string) {
    const res = await fetch("/api/hot-desk-bookings", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bookingId }),
    });
    if (res.ok) r.refresh();
  }

  async function bookRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingRoom) return;
    setBusy(true); setError(null);
    const startsAt = new Date(`${todayKey}T${rstart}:00`).toISOString();
    const endsAt   = new Date(`${todayKey}T${rend}:00`).toISOString();
    const res = await fetch("/api/meeting-room-bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingRoomId: bookingRoom.id, startsAt, endsAt, title: rtitle.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setBookingRoom(null); setRtitle(""); r.refresh();
  }

  async function cancelRoom(bookingId: string) {
    const res = await fetch("/api/meeting-room-bookings", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bookingId }),
    });
    if (res.ok) r.refresh();
  }

  function timeOnly(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  // Group desks by zone
  const desksByZone: Record<string, Desk[]> = {};
  for (const d of desks) {
    const z = d.zone ?? "Open floor";
    desksByZone[z] = desksByZone[z] ?? [];
    desksByZone[z].push(d);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("desks")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === "desks" ? "bg-white dark:bg-ink-900 shadow" : ""}`}>Hot desks</button>
        <button onClick={() => setTab("rooms")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === "rooms" ? "bg-white dark:bg-ink-900 shadow" : ""}`}>Meeting rooms</button>
      </div>

      {tab === "desks" && (
        desks.length === 0 ? (
          <div className="card p-12 text-center">
            <Armchair className="w-10 h-10 mx-auto text-ink-300 mb-3" />
            <h3 className="font-bold">No desks set up yet</h3>
            <p className="text-sm text-ink-500 mt-1">A manager needs to add desks at <code>/settings/hot-desks</code> first.</p>
          </div>
        ) : (
          Object.entries(desksByZone).map(([zone, ds]) => (
            <section key={zone}>
              <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{zone}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {ds.map(d => {
                  const fullDay = d.bookings.find(b => b.halfDay === "full");
                  const am = d.bookings.find(b => b.halfDay === "am");
                  const pm = d.bookings.find(b => b.halfDay === "pm");
                  const taken = !!fullDay || (!!am && !!pm);
                  const mineHere = d.bookings.find(b => b.memberId === myMemberId);
                  return (
                    <div key={d.id} className={`card p-3 ${taken ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Armchair className={`w-4 h-4 ${mineHere ? "text-emerald-600" : "text-ink-500"}`} />
                        <span className="font-semibold text-sm">{d.name}</span>
                      </div>
                      <div className="flex gap-1 text-[10px] text-ink-500 mb-2">
                        {d.hasMonitor && <span className="inline-flex items-center gap-0.5"><Monitor className="w-3 h-3" /> Monitor</span>}
                        {d.hasStanding && <span>· Standing</span>}
                      </div>
                      {fullDay ? (
                        <div className="text-[11px] text-ink-700 dark:text-ink-300">{fullDay.memberName} (all day)</div>
                      ) : (
                        <>
                          {am && <div className="text-[11px] text-ink-700 dark:text-ink-300">AM: {am.memberName}</div>}
                          {pm && <div className="text-[11px] text-ink-700 dark:text-ink-300">PM: {pm.memberName}</div>}
                        </>
                      )}
                      {mineHere ? (
                        <button onClick={() => cancelDesk(mineHere.id)} className="btn-ghost text-xs text-rose-600 mt-1">Cancel mine</button>
                      ) : !taken && (
                        <button onClick={() => { setBookingDesk(d); setHalfDay("full"); }} className="btn-outline text-xs mt-1 w-full"><Plus className="w-3 h-3" /> Book</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )
      )}

      {tab === "rooms" && (
        rooms.length === 0 ? (
          <div className="card p-12 text-center">
            <Video className="w-10 h-10 mx-auto text-ink-300 mb-3" />
            <h3 className="font-bold">No meeting rooms set up</h3>
            <p className="text-sm text-ink-500 mt-1">Add rooms at <code>/settings/meeting-rooms</code> first.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rooms.map(rm => (
              <li key={rm.id} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{rm.name} <span className="text-ink-500 font-normal">· {rm.capacity}p</span></div>
                    <div className="text-[10px] text-ink-500 flex gap-2 mt-0.5">
                      {rm.hasVideo && <span className="inline-flex items-center gap-0.5"><Video className="w-3 h-3" /> Video</span>}
                      {rm.hasWhiteboard && <span className="inline-flex items-center gap-0.5"><PenLine className="w-3 h-3" /> Whiteboard</span>}
                    </div>
                  </div>
                  <button onClick={() => { setBookingRoom(rm); setRtitle(""); setRstart("09:00"); setRend("10:00"); }} className="btn-outline text-xs"><Plus className="w-3 h-3" /> Book</button>
                </div>
                {rm.bookings.length > 0 && (
                  <ul className="ml-13 pl-3 border-l-2 border-brand-200 dark:border-brand-500/30 space-y-0.5">
                    {rm.bookings.map(b => (
                      <li key={b.id} className="text-[11px] flex items-center justify-between">
                        <span>
                          <b>{timeOnly(b.startsAt)} – {timeOnly(b.endsAt)}</b>: {b.title} <span className="text-ink-500">· {b.organizerName}</span>
                        </span>
                        {b.organizerId === myMemberId && (
                          <button onClick={() => cancelRoom(b.id)} className="btn-ghost text-rose-600 text-xs">Cancel</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {/* Book desk modal */}
      {bookingDesk && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setBookingDesk(null)}>
          <form onSubmit={bookDesk} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Armchair className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Book {bookingDesk.name}</span></div>
              <button type="button" onClick={() => setBookingDesk(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">When</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["am", "pm", "full"] as const).map(h => (
                    <button key={h} type="button" onClick={() => setHalfDay(h)}
                      className={`p-2 rounded-lg text-xs font-semibold border ${halfDay === h ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40 dark:text-brand-300" : "border-ink-200 dark:border-ink-700"}`}>
                      {h === "full" ? "All day" : h.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setBookingDesk(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Book
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Book room modal */}
      {bookingRoom && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setBookingRoom(null)}>
          <form onSubmit={bookRoom} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Video className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Book {bookingRoom.name}</span></div>
              <button type="button" onClick={() => setBookingRoom(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Title *</label>
                <input className="input" value={rtitle} onChange={(e) => setRtitle(e.target.value)} required maxLength={120} placeholder="Sprint planning" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start</label>
                  <input className="input" type="time" value={rstart} onChange={(e) => setRstart(e.target.value)} required />
                </div>
                <div>
                  <label className="label">End</label>
                  <input className="input" type="time" value={rend} onChange={(e) => setRend(e.target.value)} required />
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setBookingRoom(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Book
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
