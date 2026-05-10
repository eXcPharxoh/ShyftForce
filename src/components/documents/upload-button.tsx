"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileText, AlertCircle } from "lucide-react";

const CATEGORIES = ["contract", "identity", "training", "payroll", "policy", "other"];

export function UploadButton({ memberId }: { memberId?: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef  = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }

  async function submit() {
    if (!file) { setError("Pick a file"); return; }
    setError(null); setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name || file.name);
    fd.append("category", category);
    if (memberId) fd.append("memberId", memberId);
    const res = await fetch("/api/documents", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Upload failed"); return; }
    setOpen(false); setFile(null); setName(""); setCategory("other");
    r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Upload className="w-4 h-4" /> Upload
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div>
                <div className="font-semibold text-sm">Upload document</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">PDF, image, doc — up to 8MB</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>

            <div className="p-5 space-y-3">
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-ink-200 dark:border-ink-700 hover:border-brand-400 dark:hover:border-brand-500/50 hover:bg-brand-50/30 dark:hover:bg-brand-500/5"
                }`}
              >
                {file ? (
                  <>
                    <FileText className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{file.name}</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-3 text-xs text-rose-600 dark:text-rose-400 hover:underline">Remove</button>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-ink-400 dark:text-ink-500 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-ink-700 dark:text-ink-200">Drop a file here, or click to browse</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Max 8MB</div>
                  </>
                )}
                <input ref={inputRef} type="file" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              </div>

              <div>
                <label className="label">Display name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2024 W-9" />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {error && <div className="text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
            </div>

            <footer className="border-t border-ink-200 dark:border-ink-800 p-4 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={busy || !file} className="btn-primary">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload</>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
