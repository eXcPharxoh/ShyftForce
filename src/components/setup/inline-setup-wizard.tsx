"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, CalendarPlus, Check, Loader2, ArrowRight, Sparkles } from "lucide-react";

/**
 * Inline setup wizard — three required steps, each completes inside the
 * wizard via the existing APIs. No "Go to /settings/locations" jumps.
 *
 * Step 1 — Location
 *   POSTs to /api/locations with the entered name + optional address.
 *   The server geocodes the address with the existing Nominatim helper
 *   so the location is map-ready on day one.
 *
 * Step 2 — Team
 *   POSTs to /api/invitations one at a time. The user adds emails to a
 *   small list, optionally with name + role, and we send invite emails.
 *
 * Step 3 — First shift
 *   POSTs to /api/shifts with the chosen day + time + position. Sets it
 *   to "open" so any teammate can claim, since we don't know who's
 *   working yet.
 *
 * When all three steps are done, we redirect to /dashboard which will
 * stop showing QuietDayOne (since hasLocation && hasTeam && hasShift)
 * and start showing the real dashboard.
 */
export function InlineSetupWizard({
  orgName,
  userName,
  hasLocation: initialHasLocation,
  hasTeam: initialHasTeam,
  hasShift: initialHasShift,
  locations: initialLocations,
}: {
  orgName: string;
  userName: string;
  hasLocation: boolean;
  hasTeam: boolean;
  hasShift: boolean;
  locations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [hasLocation, setHasLocation] = useState(initialHasLocation);
  const [hasTeam, setHasTeam] = useState(initialHasTeam);
  const [hasShift, setHasShift] = useState(initialHasShift);
  const [locations, setLocations] = useState(initialLocations);

  // Step 1 state
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Step 2 state
  const [invites, setInvites] = useState<{ email: string; name?: string; role: "EMPLOYEE" | "MANAGER" }[]>([
    { email: "", name: "", role: "EMPLOYEE" },
  ]);
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSent, setTeamSent] = useState(0);

  // Step 3 state
  const [shiftDate, setShiftDate] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [shiftPosition, setShiftPosition] = useState("");
  const [shiftLocId, setShiftLocId] = useState<string>(locations[0]?.id ?? "");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  const current: "loc" | "team" | "shift" | "done" =
    !hasLocation ? "loc" :
    !hasTeam     ? "team" :
    !hasShift    ? "shift" :
                   "done";

  async function submitLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locName.trim()) return;
    setLocBusy(true); setLocError(null);
    const res = await fetch("/api/locations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: locName.trim(), address: locAddress.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLocBusy(false);
    if (!res.ok) { setLocError(data.error ?? "Failed to add location"); return; }
    const newLoc = { id: data.id ?? data.location?.id ?? "new", name: locName.trim() };
    setLocations(ls => [...ls, newLoc]);
    setShiftLocId(newLoc.id);
    setHasLocation(true);
  }

  async function submitTeam(e: React.FormEvent) {
    e.preventDefault();
    const real = invites.filter(i => i.email.trim());
    if (real.length === 0) {
      // Skip without inviting — but mark as "team present" since the owner is
      // technically the team if they want to fly solo for now.
      setHasTeam(true);
      return;
    }
    setTeamBusy(true); setTeamError(null);
    let sent = 0;
    for (const inv of real) {
      const r = await fetch("/api/invitations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inv.email.trim(), name: inv.name?.trim() || undefined, role: inv.role }),
      });
      if (r.ok) sent++;
    }
    setTeamBusy(false);
    setTeamSent(sent);
    if (sent === 0) { setTeamError("Couldn't send any invites — check the email addresses."); return; }
    setHasTeam(true);
  }

  async function submitShift(e: React.FormEvent) {
    e.preventDefault();
    if (!shiftLocId) { setShiftError("Pick a location first."); return; }
    setShiftBusy(true); setShiftError(null);
    const startsAt = new Date(`${shiftDate}T${shiftStart}:00`);
    const endsAt   = new Date(`${shiftDate}T${shiftEnd}:00`);
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1); // overnight wrap
    const res = await fetch("/api/shifts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: shiftLocId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        position: shiftPosition.trim() || "Shift",
        isOpen: true,
        status: "draft",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setShiftBusy(false);
    if (!res.ok) { setShiftError(data.error ?? "Failed to create shift"); return; }
    setHasShift(true);
    // Done — bounce to dashboard
    setTimeout(() => router.push("/dashboard"), 800);
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Greeting */}
      <header className="text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white items-center justify-center mb-3 shadow-soft">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Let&rsquo;s set up {orgName}</h1>
        <p className="text-[13px] text-ink-500 mt-1">
          Three quick steps. Each one lives right here — no jumping between pages.
        </p>
      </header>

      {/* Progress bar */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { key: "loc", label: "Location",  done: hasLocation },
          { key: "team", label: "Team",     done: hasTeam },
          { key: "shift", label: "Shift",   done: hasShift },
        ].map(s => (
          <div key={s.key} className="text-center">
            <div className={`h-1 rounded-full ${s.done ? "bg-emerald-500" : current === s.key ? "bg-brand-500" : "bg-white/[0.06]"}`} />
            <div className={`text-[10px] uppercase tracking-wider font-mono mt-1.5 ${s.done ? "text-emerald-400" : current === s.key ? "text-brand-400" : "text-ink-500"}`}>
              {s.done ? "Done" : s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1 — Location */}
      <Step
        n={1}
        label="Add your first location"
        blurb="Where your team clocks in. You can add more later."
        icon={MapPin}
        done={hasLocation}
        active={current === "loc"}
      >
        <form onSubmit={submitLocation} className="space-y-3">
          <Field label="Location name *">
            <input
              type="text"
              required
              value={locName}
              onChange={e => setLocName(e.target.value)}
              placeholder="Main Street Store"
              className="input"
              disabled={locBusy}
            />
          </Field>
          <Field label="Address (optional — used for GPS clock-in)">
            <input
              type="text"
              value={locAddress}
              onChange={e => setLocAddress(e.target.value)}
              placeholder="123 Main St, Springfield, IL"
              className="input"
              disabled={locBusy}
            />
          </Field>
          {locError && <div className="text-rose-400 text-[12px]">{locError}</div>}
          <button type="submit" disabled={locBusy || !locName.trim()} className="btn-primary w-full">
            {locBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Add location
          </button>
        </form>
      </Step>

      {/* Step 2 — Team */}
      <Step
        n={2}
        label="Invite your team"
        blurb="Add a few teammates. We'll email them an invite link. You can skip this if you want to fly solo for now."
        icon={Users}
        done={hasTeam}
        active={current === "team"}
      >
        <form onSubmit={submitTeam} className="space-y-3">
          <div className="space-y-2">
            {invites.map((inv, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px] gap-2">
                <input
                  type="email"
                  value={inv.email}
                  onChange={e => setInvites(arr => arr.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))}
                  placeholder="email@company.com"
                  className="input"
                  disabled={teamBusy}
                />
                <input
                  type="text"
                  value={inv.name ?? ""}
                  onChange={e => setInvites(arr => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Name (optional)"
                  className="input"
                  disabled={teamBusy}
                />
                <select
                  value={inv.role}
                  onChange={e => setInvites(arr => arr.map((x, idx) => idx === i ? { ...x, role: e.target.value as any } : x))}
                  className="input"
                  disabled={teamBusy}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setInvites(arr => [...arr, { email: "", name: "", role: "EMPLOYEE" }])}
              className="btn-ghost btn-sm w-full"
              disabled={teamBusy}
            >
              + Add another
            </button>
          </div>
          {teamError && <div className="text-rose-400 text-[12px]">{teamError}</div>}
          {teamSent > 0 && (
            <div className="text-emerald-400 text-[12px]">✅ Invite{teamSent === 1 ? "" : "s"} sent to {teamSent} {teamSent === 1 ? "person" : "people"}</div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={teamBusy} className="btn-primary flex-1">
              {teamBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {invites.some(i => i.email.trim()) ? "Send invites" : "Skip for now"}
            </button>
          </div>
        </form>
      </Step>

      {/* Step 3 — First shift */}
      <Step
        n={3}
        label="Drop your first shift"
        blurb="One shift on the calendar so the schedule has something to show. Mark it open and anyone on your team can claim it."
        icon={CalendarPlus}
        done={hasShift}
        active={current === "shift"}
      >
        <form onSubmit={submitShift} className="space-y-3">
          {locations.length > 1 && (
            <Field label="Location">
              <select value={shiftLocId} onChange={e => setShiftLocId(e.target.value)} className="input" disabled={shiftBusy}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Date">
            <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} className="input" disabled={shiftBusy} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start">
              <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="input" disabled={shiftBusy} />
            </Field>
            <Field label="End">
              <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="input" disabled={shiftBusy} />
            </Field>
          </div>
          <Field label="Position (optional)">
            <input type="text" value={shiftPosition} onChange={e => setShiftPosition(e.target.value)} placeholder="Server, Cashier, etc." className="input" disabled={shiftBusy} />
          </Field>
          {shiftError && <div className="text-rose-400 text-[12px]">{shiftError}</div>}
          <button type="submit" disabled={shiftBusy || !shiftLocId} className="btn-primary w-full">
            {shiftBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create shift &amp; finish setup
          </button>
        </form>
      </Step>

      {current === "done" && (
        <div className="card p-6 text-center mt-4">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-semibold">All set! Taking you to your dashboard…</div>
        </div>
      )}
    </div>
  );
}

function Step({ n, label, blurb, icon: Icon, done, active, children }: {
  n: number;
  label: string;
  blurb: string;
  icon: any;
  done: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`card p-5 mb-3 transition ${done ? "opacity-60" : active ? "border-brand-500/40" : ""}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          done ? "bg-emerald-500/15 text-emerald-300" :
          active ? "bg-brand-500/15 text-brand-300" :
          "bg-white/[0.04] text-ink-500"
        }`}>
          {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-0.5">
            Step {n} {done && "· DONE"}
          </div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">{blurb}</div>
        </div>
      </div>
      {active && !done && <div className="ml-13 pl-0 sm:pl-13">{children}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-medium text-ink-300 mb-1">{label}</div>
      {children}
    </label>
  );
}
