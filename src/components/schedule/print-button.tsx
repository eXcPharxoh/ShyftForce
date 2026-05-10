"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn">
      <Printer style={{ width: 14, height: 14 }} /> Print this page
    </button>
  );
}
