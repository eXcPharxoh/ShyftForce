"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Loader2, Camera, RotateCcw, Star, Check } from "lucide-react";

type ShiftItem = {
  id: string; startsAt: string; locationName: string;
  memberName: string | null; position: string | null;
  closed: boolean; closedRating: number | null; closedCustomer: string | null;
};

type Preselected = {
  id: string; locationName: string; startsAt: string;
  existing: {
    customerName: string | null;
    customerEmail: string | null;
    rating: number | null;
    notes: string | null;
    partsCostCents: number | null;
    signatureData: string | null;
    photoData: string | null;
  } | null;
} | null;

export function JobCloseoutClient({ recentShifts, preselected }: { recentShifts: ShiftItem[]; preselected: Preselected }) {
  const r = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [customerName, setCustomerName] = useState(preselected?.existing?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(preselected?.existing?.customerEmail ?? "");
  const [rating, setRating] = useState<number | null>(preselected?.existing?.rating ?? null);
  const [notes, setNotes] = useState(preselected?.existing?.notes ?? "");
  const [partsDollars, setPartsDollars] = useState<number | "">(
    preselected?.existing?.partsCostCents != null ? preselected.existing.partsCostCents / 100 : ""
  );
  const [photoData, setPhotoData] = useState<string | null>(preselected?.existing?.photoData ?? null);
  const [hasSignature, setHasSignature] = useState(!!preselected?.existing?.signatureData);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Initialise canvas with any existing signature
  useEffect(() => {
    if (!preselected?.existing?.signatureData || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = preselected.existing.signatureData;
  }, [preselected?.id]);

  function getXY(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getXY(e);
    setHasSignature(true);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !canvasRef.current || !last.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const p = getXY(e);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clearSig() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Shrink to <500KB by re-rendering through canvas at lower quality
      const img = new Image();
      img.onload = () => {
        const maxW = 1024;
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setPhotoData(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preselected) return;
    setBusy(true); setError(null);
    let signatureData: string | null = null;
    if (hasSignature && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL("image/png");
    }
    const res = await fetch("/api/job-closeouts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId: preselected.id,
        customerName: customerName.trim() || null,
        customerEmail: customerEmail.trim() || null,
        signatureData,
        rating,
        notes: notes.trim() || null,
        photoData,
        partsCostCents: partsDollars === "" ? null : Math.round(Number(partsDollars) * 100),
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setDone(true);
    setTimeout(() => r.refresh(), 800);
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  if (!preselected) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Pick a shift to close out</h3>
        {recentShifts.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-ink-300 mb-3" />
            <h3 className="font-bold">No recent shifts</h3>
            <p className="text-sm text-ink-500 mt-1">Your shifts in the last week will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentShifts.map(s => (
              <li key={s.id}>
                <Link href={`/job-closeout?shift=${s.id}`} className="card p-4 flex items-center gap-3 hover:border-brand-300 transition">
                  <div className={`w-10 h-10 rounded-xl ${s.closed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"} flex items-center justify-center shrink-0`}>
                    {s.closed ? <Check className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.position ?? "Shift"} @ {s.locationName}</div>
                    <div className="text-[11px] text-ink-500">
                      {fmt(s.startsAt)}
                      {s.memberName && ` · ${s.memberName}`}
                      {s.closed && s.closedCustomer && ` · ✓ Closed for ${s.closedCustomer}`}
                      {s.closed && s.closedRating != null && ` · ${"★".repeat(s.closedRating)}`}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg">Closeout saved</h3>
        <p className="text-sm text-ink-500 mt-1">The customer record + photo are stored. CRM webhook fired.</p>
        <Link href="/job-closeout" className="btn-outline text-sm mt-4 inline-flex">Back to list</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Closing out shift</div>
          <div className="text-[11px] text-ink-500">{preselected.locationName} · {fmt(preselected.startsAt)}</div>
        </div>
        <Link href="/job-closeout" className="btn-ghost text-xs">Change</Link>
      </div>

      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Customer</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="label">Email (for receipt)</label>
            <input className="input" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Rating from customer</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n} type="button" onClick={() => setRating(n)}
                className={`p-2 rounded-lg transition ${rating !== null && n <= rating ? "text-amber-400" : "text-ink-300 hover:text-amber-300"}`}
                aria-label={`${n} stars`}
              >
                <Star className="w-7 h-7 fill-current" />
              </button>
            ))}
            {rating !== null && (
              <button type="button" onClick={() => setRating(null)} className="btn-ghost text-xs ml-2">Clear</button>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Customer signature</h3>
          <button type="button" onClick={clearSig} className="btn-ghost text-xs"><RotateCcw className="w-3.5 h-3.5" /> Clear</button>
        </div>
        <div className="border-2 border-dashed border-ink-300 dark:border-ink-700 rounded-xl bg-white">
          <canvas
            ref={canvasRef}
            width={800} height={250}
            className="w-full h-[200px] touch-none cursor-crosshair rounded-xl"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
          />
        </div>
        <p className="text-[11px] text-ink-500">Have the customer sign with finger or stylus. Signed at: {new Date().toLocaleString("en-US")}.</p>
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Finished-job photo</h3>
        {photoData ? (
          <div className="relative">
            <img src={photoData} alt="Job result" className="rounded-xl max-h-64 w-auto" />
            <button type="button" onClick={() => setPhotoData(null)} className="absolute top-2 right-2 bg-white/90 dark:bg-ink-900/90 rounded-full p-1.5 shadow"><RotateCcw className="w-4 h-4" /></button>
          </div>
        ) : (
          <label className="btn-outline text-sm cursor-pointer inline-flex">
            <Camera className="w-4 h-4" /> Take / upload photo
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Notes &amp; parts</h3>
        <div>
          <label className="label">Completion notes</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="What did you fix? Any follow-up needed?" />
        </div>
        <div>
          <label className="label">Parts cost ($)</label>
          <input className="input" type="number" step="0.01" min={0} max={10000} value={partsDollars} onChange={(e) => setPartsDollars(e.target.value === "" ? "" : parseFloat(e.target.value))} />
        </div>
      </section>

      {error && <div className="card p-3 text-rose-600 text-sm">{error}</div>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save closeout
      </button>
    </form>
  );
}
