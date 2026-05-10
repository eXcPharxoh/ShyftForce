"use client";
import { Download } from "lucide-react";

export function ExportButton({ type, label }: { type: "timesheets" | "members" | "shifts"; label: string }) {
  return (
    <a href={`/api/reports/export?type=${type}`} className="btn-outline text-xs">
      <Download className="w-4 h-4" /> {label}
    </a>
  );
}
