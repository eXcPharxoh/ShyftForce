"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Rule = {
  id: string; type: string;
  dayOfWeek: number | null;
  startTime: string | null; endTime: string | null;
  date: string | null; notes: string | null;
};

export function AvailabilityList({ items }: { items: Rule[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  async function remove(id: string) {
    const ok = await confirm({
      title: "Delete this availability rule?",
      tone: "danger",
      confirmLabel: "Delete rule",
    });
    if (!ok) return;
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    r.refresh();
  }
  return (
    <ul className="card divide-y divide-ink-100 dark:divide-ink-800 overflow-hidden">
      {items.map(i => {
        const time = i.startTime && i.endTime ? `${i.startTime}–${i.endTime}` : "all day";
        const when = i.type === "recurring_unavailable"
          ? `Every ${DOW[i.dayOfWeek!]}`
          : new Date(i.date!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <li key={i.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">N/A</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{when} · {time}</div>
              {i.notes && <div className="text-[11px] text-ink-500 dark:text-ink-400">{i.notes}</div>}
            </div>
            <button onClick={() => remove(i.id)} aria-label="Delete rule" className="btn-ghost text-xs text-rose-600 dark:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
