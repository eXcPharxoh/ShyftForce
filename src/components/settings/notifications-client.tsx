"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, MessageSquare, Languages, Calendar, Copy, CheckCircle2, RefreshCw } from "lucide-react";
import { LOCALES, t, type Locale } from "@/lib/i18n/dictionaries";

type Initial = {
  phone: string | null;
  locale: string | null;
  calendarToken: string | null;
  smsOptIn: boolean;
  smsOptInShiftOffer: boolean;
  smsOptInScheduleChange: boolean;
  smsOptInTimeOff: boolean;
  smsOptInAlerts: boolean;
  smsQuietStartHour: number | null;
  smsQuietEndHour: number | null;
} | null;

export function NotificationsClient({ initial }: { initial: Initial }) {
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [locale, setLocale] = useState<Locale>((initial?.locale as Locale) ?? "en");
  const [smsOptIn, setSmsOptIn] = useState(initial?.smsOptIn ?? true);
  const [optShift,  setOptShift]  = useState(initial?.smsOptInShiftOffer     ?? true);
  const [optSched,  setOptSched]  = useState(initial?.smsOptInScheduleChange ?? true);
  const [optTimeOff,setOptTimeOff]= useState(initial?.smsOptInTimeOff        ?? true);
  const [optAlerts, setOptAlerts] = useState(initial?.smsOptInAlerts         ?? true);
  const [quietStart, setQuietStart] = useState<number | null>(initial?.smsQuietStartHour ?? null);
  const [quietEnd,   setQuietEnd]   = useState<number | null>(initial?.smsQuietEndHour   ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Calendar feed
  const [calUrl, setCalUrl]   = useState<string | null>(null);
  const [calWeb, setCalWeb]   = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetch("/api/me/calendar").then(r => r.json()).then(d => { setCalUrl(d.url); setCalWeb(d.webcalUrl); }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    const res = await fetch("/api/me/sms-prefs", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.trim() || null,
        locale,
        smsOptIn, smsOptInShiftOffer: optShift, smsOptInScheduleChange: optSched,
        smsOptInTimeOff: optTimeOff, smsOptInAlerts: optAlerts,
        smsQuietStartHour: quietStart, smsQuietEndHour: quietEnd,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function rotateCal() {
    setRotating(true);
    const res = await fetch("/api/me/calendar", { method: "POST" });
    const d = await res.json();
    setCalUrl(d.url); setCalWeb(d.webcalUrl);
    setRotating(false);
  }

  async function copyCal() {
    if (!calUrl) return;
    await navigator.clipboard.writeText(calUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Language */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <Languages className="w-4 h-4 text-brand-500" /> {t(locale, "settings.language")}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`px-4 py-2 rounded-xl border-2 transition flex items-center gap-2 ${locale === l.code
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 font-semibold"
                : "border-ink-200 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800/40"}`}
            >
              <span className="text-lg">{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* SMS */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
          <MessageSquare className="w-4 h-4 text-brand-500" /> {t(locale, "settings.notifications.sms")}
        </h3>
        <div>
          <label className="label">Mobile number</label>
          <input className="input max-w-sm" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
          <p className="text-[11px] text-ink-500 mt-1">We use this to text shift offers, schedule changes, and time-off decisions. Standard message rates apply.</p>
        </div>

        <label className="flex items-center gap-2 mt-4 pb-3 border-b border-ink-100 dark:border-ink-800 cursor-pointer">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)}
            className="rounded text-brand-500 focus:ring-brand-500" />
          <span className="font-semibold text-sm">{smsOptIn ? "Texts are ON" : "Texts are OFF (master switch)"}</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <Toggle label={t(locale, "settings.notifications.shift_offer")}     on={optShift}   onChange={setOptShift}   disabled={!smsOptIn} />
          <Toggle label={t(locale, "settings.notifications.schedule_change")} on={optSched}   onChange={setOptSched}   disabled={!smsOptIn} />
          <Toggle label={t(locale, "settings.notifications.time_off")}        on={optTimeOff} onChange={setOptTimeOff} disabled={!smsOptIn} />
          <Toggle label={t(locale, "settings.notifications.alerts")}          on={optAlerts}  onChange={setOptAlerts}  disabled={!smsOptIn} />
        </div>

        <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800">
          <label className="label">{t(locale, "settings.notifications.quiet_hours")}</label>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <select className="input w-28 h-9" value={quietStart ?? ""} onChange={(e) => setQuietStart(e.target.value === "" ? null : parseInt(e.target.value))} disabled={!smsOptIn}>
              <option value="">—</option>
              {Array.from({length:24}, (_,i) => <option key={i} value={i}>{i}:00</option>)}
            </select>
            <span className="text-ink-500">→</span>
            <select className="input w-28 h-9" value={quietEnd ?? ""} onChange={(e) => setQuietEnd(e.target.value === "" ? null : parseInt(e.target.value))} disabled={!smsOptIn}>
              <option value="">—</option>
              {Array.from({length:24}, (_,i) => <option key={i} value={i}>{i}:00</option>)}
            </select>
            <span className="text-[11px] text-ink-500">e.g. 22 → 7 = no texts between 10pm and 7am</span>
          </div>
        </div>
      </section>

      {/* Calendar feed */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
          <Calendar className="w-4 h-4 text-brand-500" /> {t(locale, "settings.calendar")}
        </h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">{t(locale, "settings.calendar.description")}</p>

        {calUrl ? (
          <>
            <label className="label">Subscription URL</label>
            <div className="flex items-center gap-2">
              <code className="input flex-1 text-xs font-mono bg-ink-50 dark:bg-ink-900 select-all overflow-x-auto whitespace-nowrap">{calUrl}</code>
              <button onClick={copyCal} className="btn-outline text-xs shrink-0">
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {calWeb && <a href={calWeb} className="btn-primary text-xs">Add to Apple Calendar</a>}
              <a target="_blank" rel="noopener"
                 href={`https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(calUrl)}`}
                 className="btn-outline text-xs">Add to Google Calendar</a>
              <button onClick={rotateCal} disabled={rotating} className="btn-ghost text-xs ml-auto">
                {rotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {t(locale, "settings.calendar.rotate")}
              </button>
            </div>
            <p className="text-[10px] text-ink-500 mt-3">
              Anyone with this URL can read (not edit) your shifts. Keep it private. Rotate if you suspect it leaked.
            </p>
          </>
        ) : (
          <div className="text-xs text-ink-500"><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> Loading your feed URL…</div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">Saved ✓</span>}
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t(locale, "action.save")}
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 p-2.5 rounded-lg border transition cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : "border-ink-200 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40"}`}>
      <input type="checkbox" checked={on} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded text-brand-500 focus:ring-brand-500" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
