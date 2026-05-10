"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { WithdrawModal } from "./withdraw-modal";

type Balance = { enabled: boolean; availableCents: number; feeCentsPerWithdrawal: number; minWithdrawalCents: number; blockReason: string | null };

export function WithdrawButton({ balance }: { balance: Balance }) {
  const [open, setOpen] = useState(false);
  if (!balance.enabled) return null;
  const blocked = balance.blockReason !== null;
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={blocked} className="btn-primary">
        <Sparkles className="w-4 h-4" /> Get paid early
      </button>
      {open && <WithdrawModal balance={balance} onClose={() => setOpen(false)} onDone={() => setOpen(false)} />}
    </>
  );
}
