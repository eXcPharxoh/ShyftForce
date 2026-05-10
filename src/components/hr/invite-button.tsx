"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2, Send, Plus, Trash2 } from "lucide-react";

type Loc = { id: string; name: string };
type Row = { email: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; position: string; locationId: string };

export function InviteButton({ locations }: { locations: Loc[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ email: "", role: "EMPLOYEE", position: "", locationId: locations[0]?.id ?? "" }]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => setRows(rs => [...rs, { email: "", role: "EMPLOYEE", position: "", locationId: locations[0]?.id ?? "" }]);
  const setField = (i: number, k: keyof Row, v: string) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } as Row : r));
  const remove = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i));

  async function send() {
    setError(null); setSending(true);
    const invitations = rows.filter(r => r.email.trim()).map(r => ({
      email: r.email.trim(), role: r.role,
      position: r.position.trim() || undefined,
      locationId: r.locationId || undefined,
    }));
    if (invitations.length === 0) { setError("Add at least one email"); setSending(false); return; }
    const res = await fetch("/api/invites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitations }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(data.invited);
    setTimeout(() => { setOpen(false); setDone(null); setRows([{ email: "", role: "EMPLOYEE", position: "", locationId: locations[0]?.id ?? "" }]); r.refresh(); }, 1400);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> Invite</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 flex items-center justify-between shrink-0">
              <div>
                <div className="font-semibold text-sm">Invite teammates</div>
                <div className="text-[11px] text-ink-500">They'll get a magic link to join your workspace.</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100"><X className="w-4 h-4" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="label">Email</label>
                    <input className="input h-9" type="email" value={row.email} onChange={(e) => setField(i, "email", e.target.value)} placeholder="alex@company.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Role</label>
                    <select className="input h-9" value={row.role} onChange={(e) => setField(i, "role", e.target.value as Row["role"])}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="label">Position</label>
                    <input className="input h-9" value={row.position} onChange={(e) => setField(i, "position", e.target.value)} placeholder="Cashier" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Location</label>
                    <select className="input h-9" value={row.locationId} onChange={(e) => setField(i, "locationId", e.target.value)}>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => remove(i)} className="col-span-1 btn-ghost h-9 text-rose-600" disabled={rows.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addRow} className="btn-outline text-xs"><Plus className="w-4 h-4" /> Add another</button>
            </div>
            <footer className="border-t border-ink-200 p-4 flex items-center justify-between shrink-0">
              {error && <div className="text-rose-600 text-xs">{error}</div>}
              {done != null && <div className="text-emerald-700 text-xs">{done} invitation{done === 1 ? "" : "s"} sent ✨</div>}
              <div className="ml-auto flex gap-2">
                <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                <button onClick={send} disabled={sending} className="btn-primary">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send invites</>}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
