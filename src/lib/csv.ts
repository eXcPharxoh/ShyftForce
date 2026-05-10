/** Tiny CSV writer — handles commas, quotes, newlines properly. */
export function toCsv(rows: Array<Record<string, any>>, columns?: string[]): string {
  if (rows.length === 0) return columns?.join(",") ?? "";
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : (v instanceof Date ? v.toISOString() : String(v));
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.join(",");
  const body = rows.map(r => cols.map(c => escape(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
