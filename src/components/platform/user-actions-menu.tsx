"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2, Mail, KeyRound, Unlock, ShieldCheck, UserX, UserCheck, ChevronDown } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Props = {
  userId: string;
  email: string;
  name: string;
  locked: boolean;
  verified: boolean;
  role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
  status?: "active" | "inactive";
};

export function UserActionsMenu(props: Props) {
  const r = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function call(action: string, payload: Record<string, any> = {}, opts: { confirm?: { title: string; tone?: "danger" | "warning" | "default"; description?: string; confirmLabel?: string } } = {}) {
    if (opts.confirm) {
      const ok = await confirm(opts.confirm);
      if (!ok) return;
    }
    setBusy(action); setMsg(null);
    const res = await fetch(`/api/platform/users/${props.userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setMsg(data.error ?? "Failed"); return; }
    setMsg(messageFor(action));
    setTimeout(() => setMsg(null), 2500);
    r.refresh();
  }

  return (
    <div ref={wrap} className="relative inline-block text-left">
      <button onClick={() => setOpen(v => !v)} aria-label={`User actions for ${props.name}`} className="btn-ghost text-xs p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 z-30 card p-1 shadow-xl bg-white dark:bg-ink-900 animate-scale-in origin-top-right">
          <MenuItem icon={KeyRound}    label="Send password reset" busy={busy === "send_reset_password"}
            onClick={() => call("send_reset_password")} />
          {!props.verified && (
            <MenuItem icon={Mail} label="Resend verify email" busy={busy === "send_email_verify"}
              onClick={() => call("send_email_verify")} />
          )}
          {!props.verified && (
            <MenuItem icon={ShieldCheck} label="Mark email verified" busy={busy === "verify_email"}
              onClick={() => call("verify_email", {}, { confirm: { title: "Mark this user's email as verified?", description: "Skips the normal email-verification flow.", confirmLabel: "Mark verified" } })} />
          )}
          {props.locked && (
            <MenuItem icon={Unlock} label="Unlock account" busy={busy === "unlock"}
              onClick={() => call("unlock")} />
          )}

          {props.role && (
            <RoleSubmenu currentRole={props.role} busyAction={busy} onPick={(role) => call("change_role", { role }, { confirm: { title: `Change role to ${role}?`, description: `This changes ${props.name}'s permissions inside their organization.`, confirmLabel: `Set as ${role}` } })} />
          )}

          {props.status && (
            props.status === "active"
              ? <MenuItem icon={UserX}     label="Deactivate member" tone="danger" busy={busy === "set_status"}
                  onClick={() => call("set_status", { status: "inactive" }, { confirm: { title: "Deactivate this member?", description: "They keep their record but can't be scheduled and are hidden from active rosters.", tone: "warning", confirmLabel: "Deactivate" } })} />
              : <MenuItem icon={UserCheck} label="Reactivate member" busy={busy === "set_status"}
                  onClick={() => call("set_status", { status: "active" })} />
          )}
        </div>
      )}
      {msg && <div className="absolute right-0 top-full mt-1 text-[10px] bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded px-2 py-0.5 whitespace-nowrap z-30">{msg}</div>}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, busy, tone }: { icon: any; label: string; onClick: () => void; busy?: boolean; tone?: "danger" }) {
  const cls = tone === "danger"
    ? "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
    : "text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800";
  return (
    <button onClick={onClick} disabled={busy} className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm font-medium transition ${cls}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

function RoleSubmenu({ currentRole, busyAction, onPick }: { currentRole: "ADMIN" | "MANAGER" | "EMPLOYEE"; busyAction: string | null; onPick: (r: "ADMIN" | "MANAGER" | "EMPLOYEE") => void }) {
  const [open, setOpen] = useState(false);
  const roles: ("ADMIN" | "MANAGER" | "EMPLOYEE")[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
  return (
    <div className="border-t border-ink-100 dark:border-ink-800 mt-1 pt-1">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition">
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} />
        Change role <span className="ml-auto text-[10px] text-ink-400 font-mono">{currentRole}</span>
      </button>
      {open && (
        <div className="pl-5 space-y-0.5 py-1">
          {roles.filter(r => r !== currentRole).map(r => (
            <button key={r} disabled={busyAction === "change_role"} onClick={() => onPick(r)}
              className="flex items-center gap-2 w-full px-2.5 py-1 rounded text-xs text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800">
              → {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function messageFor(action: string) {
  switch (action) {
    case "send_reset_password": return "Reset email sent ✓";
    case "send_email_verify":   return "Verify email sent ✓";
    case "verify_email":        return "Marked verified ✓";
    case "unlock":              return "Unlocked ✓";
    case "change_role":         return "Role updated ✓";
    case "set_status":          return "Status updated ✓";
    default: return "Done ✓";
  }
}
