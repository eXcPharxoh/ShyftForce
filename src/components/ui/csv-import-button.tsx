"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";

/**
 * Reusable CSV bulk-import button. Pass:
 *   - endpoint:  the /api/import/* route to POST to (must accept { csv })
 *   - label:     button label
 *   - sampleCsv: a sample shown to the user + downloadable as a template
 *   - title:     dialog header
 */
export function CsvImportButton({
  endpoint, label, sampleCsv, title, helpHref,
}: {
  endpoint: string;
  label: string;
  sampleCsv: string;
  title: string;
  helpHref?: string;
}) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: Record<string, number>; results: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCsv(""); setFileName(null); setResult(null); setError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
  }

  function downloadSample() {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submit() {
    if (!csv.trim()) { setError("Pick a file or paste CSV"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const d = await res.json();
      setBusy(false);
      if (!res.ok) { setError(d.error ?? "Import failed"); return; }
      setResult(d);
      r.refresh();
    } catch (e: any) {
      setBusy(false);
      setError(e.message ?? "Import failed");
    }
  }

  return (
    <>
      <button onClick={() => { reset(); setOpen(true); }} className="btn-outline text-sm">
        <Upload className="w-4 h-4" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">{title}</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>

            <div className="p-5 overflow-y-auto space-y-4">
              {!result && (
                <>
                  <div className="flex items-center justify-between">
                    <button onClick={downloadSample} className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> Download CSV template</button>
                    {helpHref && <a href={helpHref} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline">Format help</a>}
                  </div>

                  <div>
                    <label className="label">Upload CSV file</label>
                    <label className="card p-6 border-dashed text-center cursor-pointer hover:border-brand-300 block">
                      <Upload className="w-6 h-6 mx-auto text-ink-400 mb-2" />
                      <div className="text-sm font-semibold">{fileName ?? "Click to pick a CSV file"}</div>
                      <div className="text-[11px] text-ink-500 mt-1">…or paste CSV text below</div>
                      <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="label">Or paste CSV</label>
                    <textarea
                      className="input font-mono text-[11px] min-h-[140px]"
                      value={csv}
                      onChange={(e) => { setCsv(e.target.value); setFileName(null); }}
                      placeholder={sampleCsv.split("\n").slice(0, 3).join("\n") + "\n…"}
                    />
                  </div>

                  {error && (
                    <div className="card p-3 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="card p-4 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-semibold">Import complete</div>
                      <div className="text-[12px] text-ink-700 dark:text-ink-300 mt-0.5">
                        {Object.entries(result.summary).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </div>
                    </div>
                  </div>
                  {result.results.filter((r: any) => r.status === "error").length > 0 && (
                    <div className="card p-3">
                      <div className="text-xs font-semibold mb-2">Errors</div>
                      <ul className="text-[11px] text-rose-700 dark:text-rose-300 space-y-1 max-h-48 overflow-y-auto">
                        {result.results.filter((r: any) => r.status === "error").map((r: any, i: number) => (
                          <li key={i}><b>{r.email ?? r.name ?? r.number}</b>: {r.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              {result ? (
                <button onClick={() => setOpen(false)} className="btn-primary">Done</button>
              ) : (
                <>
                  <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                  <button onClick={submit} disabled={busy || !csv.trim()} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
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
