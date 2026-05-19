"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function Form8027Client({ locations }: { locations: { id: string; name: string }[] }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1); // default to last completed tax year
  const [locId, setLocId] = useState<string>("");

  async function download() {
    const params = new URLSearchParams({ year: String(year) });
    if (locId) params.set("location_id", locId);
    window.open(`/api/tips/form-8027?${params.toString()}`, "_blank");
  }

  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold mb-3">Generate workpaper</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Tax year</label>
          <select className="input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => thisYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
            <option value="">All locations (combined)</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <button onClick={download} className="btn-primary">
        <Download className="w-4 h-4" /> Download Form 8027 CSV
      </button>
    </section>
  );
}
