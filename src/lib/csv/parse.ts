// Minimal CSV parser. Handles quoted commas, escaped quotes, CRLF.
// We use this for bulk-import flows (rooms, equipment, sub pool, members).

export type CsvParsed = { headers: string[]; rows: Record<string, string>[] };

export function parseCsv(text: string): CsvParsed | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;
  const headers = splitRow(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cells = splitRow(line).map(c => c.trim().replace(/^["']|["']$/g, ""));
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = cells[i] ?? ""; });
    return o;
  });
  return { headers, rows };
}

function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\"" && line[i + 1] === "\"") { cur += "\""; i++; continue; }
    if (c === "\"") { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
