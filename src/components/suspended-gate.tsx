import { Bolt } from "@/components/ui/logo";
import { PowerOff } from "lucide-react";

/**
 * Workspace-suspended hard gate. Rendered by (app)/layout.tsx when a platform
 * admin has frozen the org. Blocks the whole workspace; data is untouched.
 * Platform admins are exempt (they manage suspension from /platform).
 */
export function SuspendedGate({ reason }: { reason: string | null }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.94)", backdropFilter: "blur(16px)" }}
    >
      <div className="w-full max-w-[520px] text-center">
        <Bolt size={44} className="mx-auto" />
        <div className="mt-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-300">
          <PowerOff className="w-7 h-7" />
        </div>
        <h1 className="font-display text-[30px] font-medium tracking-tight-2 mt-5">Workspace suspended</h1>
        <p className="text-[15px] text-ink-300 mt-3 leading-relaxed">
          Access to this workspace has been paused by ShyftForce. Your data is safe and intact.
        </p>
        {reason && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
            {reason}
          </div>
        )}
        <div className="mt-6 text-[13px] text-ink-400">
          Think this is a mistake? Email{" "}
          <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a>.
        </div>
        <div className="mt-8">
          <a href="/api/auth/signout" className="btn-ghost btn-sm">Sign out</a>
        </div>
      </div>
    </div>
  );
}
