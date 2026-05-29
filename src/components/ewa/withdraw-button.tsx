"use client";
import { useState } from "react";
import { Sparkles, NotebookPen } from "lucide-react";
import { WithdrawModal } from "./withdraw-modal";

type Balance = {
  enabled: boolean;
  availableCents: number;
  feeCentsPerWithdrawal: number;
  minWithdrawalCents: number;
  blockReason?: string | null;
  providerName?: "internal_ledger" | "branch" | "tapcheck" | "dailypay" | "stripe_treasury";
};

export function WithdrawButton({ balance }: { balance: Balance }) {
  const [open, setOpen] = useState(false);
  if (!balance.enabled) return null;
  const blocked = balance.blockReason !== null;
  const isIou = (balance.providerName ?? "internal_ledger") === "internal_ledger";
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={blocked} className="btn-primary">
        {isIou ? <NotebookPen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        {isIou ? "Request advance" : "Get paid early"}
      </button>
      {open && <WithdrawModal balance={balance} onClose={() => setOpen(false)} onDone={() => setOpen(false)} />}
    </>
  );
}
