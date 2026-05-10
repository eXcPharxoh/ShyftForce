"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";

const SAMPLE_CSV = `email,name,role,position,location,phone,hourlyRate,hireDate
alice@acme.com,Alice Garcia,EMPLOYEE,Server,Main Street Store,555-0101,18.50,2024-03-12
bob@acme.com,Bob Lee,MANAGER,Site Manager,Main Street Store,555-0102,32.00,2023-08-01
carol@acme.com,Carol Wei,EMPLOYEE,Cashier,Downtown Bistro,555-0103,17.00,2025-01-15`;

export function ImportCsvButton({ locations }: { locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [invite, setInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: Record<string, number>; results: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setCsv(""); setResult(null); setError(null); setFileName(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setCsv(text);
  }

  function parseCsv(text: string): { headers: string[]; rows: Record<string, any>[] } | null {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;
    const headers = splitCsvRow(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ""));
    const rows = lines.slice(1).map(line => {
      const cells = splitCsvRow(line).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const o: Record<string, any> = {};
      headers.forEach((h, i) => { o[h] = cells[i] ?? ""; });
      return o;
    });
    return { headers, rows };
  }

  // Simple CSV row split that handles quoted commas
  function splitCsvRow(line: string): string[] {
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  async function submit() {
    setError(null);
    const parsed = parseCsv(csv);
    if (!parsed) { setError("Couldn't parse CSV — needs at least a header row + 1 row."); return; }
    if (!parsed.headers.includes("email") && !parsed.headers.includes("Email")) {
      setError(`No "email" column found. Headers: ${parsed.headers.join(", ")}`); return;
    }
    setBusy(true);
    const res = await fetch("/api/members/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsed.rows, invite }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Import failed"); return; }
    setResult(data);
    r.refresh();
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shyftforce-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline">
        <Upload className="w-4 h-4" /> Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm leading-none">Import employees from CSV</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Drop your existing roster · we'll send invitations</div>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-thin">
              {!result && (
                <>
                  <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 p-3.5 text-xs text-brand-900 dark:text-brand-200">
                    <div className="font-semibold mb-1">Required column: <code className="bg-white/60 dark:bg-black/30 px-1 rounded">email</code></div>
                    <div className="leading-relaxed">Optional: <code>name, role, position, location, phone, hourlyRate, hireDate, birthday, emergencyContactName, emergencyContactPhone, notes</code>. Headers are case-insensitive.</div>
                    <button onClick={downloadSample} className="mt-2 text-[11px] text-brand-700 dark:text-brand-300 font-semibold hover:underline inline-flex items-center gap-1">
                      <Download className="w-3 h-3" /> Download sample template
                    </button>
                  </div>

                  <div>
                    <label className="label">Upload .csv file</label>
                    <label className="block">
                      <div className="border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-xl p-6 text-center hover:border-brand-400 dark:hover:border-brand-500/50 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 cursor-pointer transition">
                        <Upload className="w-6 h-6 text-ink-400 dark:text-ink-500 mx-auto mb-2" />
                        <div className="text-sm font-medium text-ink-700 dark:text-ink-200">{fileName ?? "Click to choose CSV"}</div>
                        <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Or paste below</div>
                      </div>
                      <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="label">Or paste CSV directly</label>
                    <textarea
                      className="input min-h-[120px] font-mono text-[11px]"
                      placeholder={SAMPLE_CSV}
                      value={csv}
                      onChange={(e) => setCsv(e.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)}
                      className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
                    <span className="text-ink-700 dark:text-ink-300">Send invitation emails (recommended) — recipients click a link to set their own password</span>
                  </label>

                  {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
                </>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Created"  v={result.summary.created  ?? 0} tone="emerald" />
                    <Stat label="Invited"  v={result.summary.invited  ?? 0} tone="emerald" />
                    <Stat label="Existing" v={result.summary.exists   ?? 0} tone="ink" />
                    <Stat label="Errors"   v={result.summary.error    ?? 0} tone="rose" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 mt-3">Per-row results</div>
                  <ul className="divide-y divide-ink-100 dark:divide-ink-800 text-xs max-h-64 overflow-y-auto scroll-thin">
                    {result.results.map((r, i) => (
                      <li key={i} className="py-1.5 flex items-center gap-2">
                        {r.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />}
                        {r.status !== "error" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                        <span className="font-mono text-[10px] text-ink-400 dark:text-ink-500">row {r.row}</span>
                        <span className="text-ink-700 dark:text-ink-300">{r.email ?? "—"}</span>
                        <span className="ml-auto text-ink-500 dark:text-ink-400 text-[11px]">{r.status}{r.message ? ` · ${r.message}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="border-t border-ink-200 dark:border-ink-800 p-4 flex items-center justify-end gap-2 shrink-0">
              {result ? (
                <>
                  <button onClick={reset} className="btn-ghost">Import more</button>
                  <button onClick={() => { setOpen(false); reset(); }} className="btn-primary">Done</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                  <button onClick={submit} disabled={busy || !csv.trim()} className="btn-primary">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import {invite ? "& invite" : "now"}</>}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, v, tone }: { label: string; v: number; tone: "emerald" | "rose" | "ink" }) {
  const cls = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : tone === "rose" ? "text-rose-700 dark:text-rose-300" : "text-ink-900 dark:text-ink-50";
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-2.5 text-center">
      <div className={`text-xl font-bold tracking-tight-2 ${cls}`}>{v}</div>
      <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400">{label}</div>
    </div>
  );
}
