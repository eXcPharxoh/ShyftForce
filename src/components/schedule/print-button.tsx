"use client";
import { Printer, Download } from "lucide-react";

export function PrintButton() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={() => window.print()}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
          background: "#0f172a", color: "#fff", border: 0, cursor: "pointer",
        }}
      >
        <Printer style={{ width: 14, height: 14 }} /> Print
      </button>
      <button
        onClick={() => window.print()}
        title="Use 'Save as PDF' in the print dialog"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
          background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", cursor: "pointer",
        }}
      >
        <Download style={{ width: 14, height: 14 }} /> Save as PDF
      </button>
      <span style={{ fontSize: 11, color: "#64748b" }}>
        Use the print dialog to save as PDF
      </span>
    </div>
  );
}
