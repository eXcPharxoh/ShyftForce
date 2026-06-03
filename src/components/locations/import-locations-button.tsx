"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileSpreadsheet, Download, AlertCircle } from "lucide-react";

const SAMPLE_CSV = `name,address,geofenceRadiusMeters,weeklyBudget,projectedRevenue
Main Street Store,123 Main St Springfield IL,100,12000,14000
Downtown Branch,456 State St Chicago IL,75,8500,9200
Warehouse,789 Industrial Ave Joliet IL,250,4500,0`;

/**
 * Bulk-import locations. Each row optionally has an address — when present
 * the server geocodes via Nominatim (the existing helper). Up to 50 rows
 * per import because geocoding has rate limits.
 */
export function ImportLocationsButton() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: Record<string, number>; results: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() { setCsv(""); setResult(null); setError(null); setFileName(null); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setCsv(text);
  }

  function parseCsv(text: string): { headers: string[]; rows: Record<string, any>[] } | null {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;
    const split = (line: string) => {
      const out: string[] = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim().replace(/^["']|["']$/g, ""));
    };
    const headers = split(lines[0]);
    const rows = lines.slice(1).map(line => {
      const cells = split(line);
      const o: Record<string, any> = {};
      headers.forEach((h, i) => { o[h] = cells[i] ?? ""; });
      return o;
    });
    return { headers, rows };
  }

  async function submit() {
    setError(null);
    const parsed = parseCsv(csv);
    if (!parsed) { setError("Couldn't parse CSV — needs at least a header row + 1 row."); return; }
    setBusy(true);
    const res = await fetch("/api/locations/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsed.rows }),
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
    a.href = url; a.download = "shyftforce-locations-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        <Upload className="w-3.5 h-3.5" /> Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm leading-none">Import locations from CSV</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">
                  Up to 50 at a time · addresses are geocoded
                </div>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-thin">
              {!result && (
                <>
                  <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 p-3.5 text-xs text-brand-900 dark:text-brand-200">
                    <div className="font-semibold mb-1">
                      Required: <code className="bg-white/60 dark:bg-black/30 px-1 rounded">name</code>
                    </div>
                    <div className="leading-relaxed">
                      Optional: <code>address</code> (geocoded for map + GPS clock-in), <code>geofenceRadiusMeters</code> (default 100), <code>weeklyBudget</code>, <code>projectedRevenue</code>, <code>timezone</code> (IANA name like "America/Chicago").
                    </div>
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
                      value={csv}
                      onChange={(e) => setCsv(e.target.value)}
                      placeholder="name,address,geofenceRadiusMeters&#10;Main Store,123 Main St,100"
                      className="input font-mono text-xs"
                      rows={5}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}
                </>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4">
                    <div className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">
                      ✅ {result.summary.created} of {result.summary.total} locations created
                    </div>
                  </div>
                  {result.summary.errors > 0 && (
                    <div className="text-xs space-y-1 max-h-40 overflow-y-auto scroll-thin">
                      {result.results.filter((r: any) => r.status === "error").map((r: any, i: number) => (
                        <div key={i} className="text-rose-700 dark:text-rose-300">
                          Row {r.row}{r.name ? ` (${r.name})` : ""}: {r.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 shrink-0">
              {result ? (
                <button onClick={() => { setOpen(false); reset(); }} className="btn-primary">Done</button>
              ) : (
                <>
                  <button onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                  <button onClick={submit} disabled={busy || !csv.trim()} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import
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
