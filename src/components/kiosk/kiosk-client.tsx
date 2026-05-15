"use client";
import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut, Coffee, CoffeeIcon, Check, AlertCircle, Loader2, Delete } from "lucide-react";

const TOKEN_KEY = "shyftforce-kiosk-token";
type ClockType = "clock_in" | "clock_out" | "break_start" | "break_end";

export function KioskClient({ initialToken }: { initialToken: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin]     = useState("");
  const [action, setAction] = useState<ClockType>("clock_in");
  const [busy, setBusy]   = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; title: string; sub?: string } | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Live clock
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist token (or pull from URL query on first load)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (initialToken) {
      window.localStorage.setItem(TOKEN_KEY, initialToken);
      setToken(initialToken);
      // Strip the token from the URL for kiosk privacy
      window.history.replaceState({}, "", "/kiosk");
    } else if (stored) {
      setToken(stored);
    }
  }, [initialToken]);

  function addDigit(d: string) {
    setPin(prev => prev.length >= 6 ? prev : prev + d);
  }
  function delDigit() { setPin(prev => prev.slice(0, -1)); }

  async function submit() {
    if (busy || pin.length < 4) return;
    setBusy(true); setFeedback(null);
    const res = await fetch("/api/kiosk/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ pin, type: action }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false); setPin("");
    if (!res.ok) {
      setFeedback({ kind: "err", title: d.error ?? "Failed", sub: "Try your PIN again or see a manager." });
    } else {
      const verb = action === "clock_in" ? "Clocked in" : action === "clock_out" ? "Clocked out" : action === "break_start" ? "Break started" : "Back from break";
      setFeedback({ kind: "ok", title: `${verb} — ${d.memberName}`, sub: new Date(d.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-ink-950 text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h1 className="text-3xl font-bold mb-3">Kiosk not paired</h1>
          <p className="text-white/70 text-sm">A manager needs to pair this device first. From the admin app: <b>Settings → Kiosk devices → Pair new device</b>, then open the URL on this tablet.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white flex flex-col select-none">
      <header className="p-6 flex items-center justify-between border-b border-white/10">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold">Kiosk · Time clock</div>
          <div className="text-4xl font-bold tabular-nums tracking-tight-2 mt-1">
            {now?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">{now?.toLocaleDateString("en-US", { weekday: "long" })}</div>
          <div className="text-sm text-white/60">{now?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-2 gap-8 p-8 items-center justify-items-center">
        {/* Left: action picker + PIN display */}
        <div className="w-full max-w-md">
          <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-2">Action</div>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <ActionBtn active={action === "clock_in"}    icon={LogIn}  label="Clock in"  tone="emerald" onClick={() => setAction("clock_in")} />
            <ActionBtn active={action === "clock_out"}   icon={LogOut} label="Clock out" tone="rose"    onClick={() => setAction("clock_out")} />
            <ActionBtn active={action === "break_start"} icon={Coffee} label="Start break" tone="amber" onClick={() => setAction("break_start")} />
            <ActionBtn active={action === "break_end"}   icon={CoffeeIcon} label="End break" tone="brand" onClick={() => setAction("break_end")} />
          </div>

          <div className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-2">Your PIN</div>
          <div className="bg-white/5 border border-white/20 rounded-2xl p-6 flex items-center justify-center gap-3 h-24">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full transition ${
                i < pin.length ? "bg-white" : "border-2 border-white/30"
              }`} />
            ))}
          </div>
        </div>

        {/* Right: PIN pad */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => addDigit(d)} disabled={busy}
              className="aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-4xl font-bold transition disabled:opacity-50">
              {d}
            </button>
          ))}
          <button onClick={delDigit} disabled={busy} aria-label="Delete digit"
            className="aspect-square rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 flex items-center justify-center transition disabled:opacity-50">
            <Delete className="w-7 h-7" />
          </button>
          <button onClick={() => addDigit("0")} disabled={busy}
            className="aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-4xl font-bold transition disabled:opacity-50">
            0
          </button>
          <button onClick={submit} disabled={busy || pin.length < 4}
            className="aspect-square rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 className="w-7 h-7 animate-spin" /> : <Check className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur animate-fade-in`} onClick={() => setFeedback(null)}>
          <div className={`max-w-md mx-4 rounded-2xl p-10 text-center ${feedback.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"}`}>
            <div className="w-20 h-20 mx-auto rounded-full bg-white/15 flex items-center justify-center mb-4">
              {feedback.kind === "ok" ? <Check className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            </div>
            <div className="text-2xl font-bold mb-1">{feedback.title}</div>
            {feedback.sub && <div className="text-white/85 text-sm">{feedback.sub}</div>}
          </div>
        </div>
      )}
    </main>
  );
}

function ActionBtn({ active, icon: Icon, label, tone, onClick }: { active: boolean; icon: any; label: string; tone: "emerald" | "rose" | "amber" | "brand"; onClick: () => void }) {
  const toneCls: Record<string, string> = {
    emerald: active ? "bg-emerald-500 text-white border-emerald-400" : "bg-white/5 text-emerald-300 border-white/10 hover:bg-emerald-500/15",
    rose:    active ? "bg-rose-500 text-white border-rose-400"       : "bg-white/5 text-rose-300 border-white/10 hover:bg-rose-500/15",
    amber:   active ? "bg-amber-500 text-white border-amber-400"     : "bg-white/5 text-amber-300 border-white/10 hover:bg-amber-500/15",
    brand:   active ? "bg-brand-500 text-white border-brand-400"     : "bg-white/5 text-brand-300 border-white/10 hover:bg-brand-500/15",
  };
  return (
    <button onClick={onClick} className={`py-4 rounded-xl border-2 font-semibold transition flex flex-col items-center gap-1 ${toneCls[tone]}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
