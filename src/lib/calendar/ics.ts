// Minimal iCalendar (RFC 5545) writer. Just enough for shift subscriptions —
// no recurrence rules, no time zones beyond UTC, no embedded VTIMEZONE.
//
// All times are emitted as UTC (Z-suffixed) which Apple/Google/Outlook parse
// correctly and display in the viewer's local time. That avoids the rabbit
// hole of bundling tzdata into our build for full VTIMEZONE entries.

export type IcsEvent = {
  uid:         string;
  summary:     string;
  description?:string;
  location?:   string;
  startsAt:    Date;
  endsAt:      Date;
  status?:     "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  url?:        string;
};

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g,  "\\,")
    .replace(/;/g,  "\\;");
}

/** Folds a long line per RFC 5545 (max 75 octets, CRLF + space continuation). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  out.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return out.join("\r\n");
}

export function buildIcs(args: {
  calendarName: string;
  description?: string;
  events:       IcsEvent[];
  refreshIntervalMinutes?: number; // hint for clients to repoll
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShyftForce//ShyftForce Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(args.calendarName)}`),
    args.description ? fold(`X-WR-CALDESC:${escapeText(args.description)}`) : "",
    `X-PUBLISHED-TTL:PT${args.refreshIntervalMinutes ?? 60}M`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${args.refreshIntervalMinutes ?? 60}M`,
  ].filter(Boolean);

  const now = fmt(new Date());
  for (const e of args.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmt(e.startsAt)}`);
    lines.push(`DTEND:${fmt(e.endsAt)}`);
    lines.push(fold(`SUMMARY:${escapeText(e.summary)}`));
    if (e.description) lines.push(fold(`DESCRIPTION:${escapeText(e.description)}`));
    if (e.location)    lines.push(fold(`LOCATION:${escapeText(e.location)}`));
    if (e.url)         lines.push(fold(`URL:${e.url}`));
    if (e.status)      lines.push(`STATUS:${e.status}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
