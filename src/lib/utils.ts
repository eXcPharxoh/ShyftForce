import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function fmtMoney(v: number | null | undefined, currency = "USD") {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}

export function fmtHours(v: number) {
  return `${v.toFixed(1)}h`;
}

export function dateLabel(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function timeLabel(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0);
  const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export function relTime(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - x.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff/86400)}d ago`;
  return x.toLocaleDateString();
}

export function initials(name: string) {
  return name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
}
