// Email service. Uses Resend in production (set RESEND_API_KEY in .env).
// In development without a key, logs to console so flows still work.

const RESEND_KEY  = process.env.RESEND_API_KEY;
const FROM_EMAIL  = process.env.EMAIL_FROM ?? "shyftforce <noreply@shyftforce.com>";
const APP_URL     = process.env.NEXTAUTH_URL ?? "http://localhost:3210";

export type SendArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; provider: "resend" | "console"; error?: string }> {
  if (!RESEND_KEY) {
    console.log(`\n📧 [EMAIL → ${to}] ${subject}\n${stripTags(html)}\n`);
    return { ok: true, provider: "console" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", body);
      return { ok: false, provider: "resend", error: body };
    }
    return { ok: true, provider: "resend" };
  } catch (e: any) {
    return { ok: false, provider: "resend", error: e?.message ?? "send failed" };
  }
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); }

// ---------- Templates ----------
export const Email = {
  verify(args: { name: string; token: string }) {
    const url = `${APP_URL}/verify-email?token=${args.token}`;
    return template({
      preview: "Confirm your shyftforce email",
      title: `Hi ${args.name}, verify your email`,
      body: `Welcome to shyftforce! Click the button below to verify your email and finish setting up your workspace.`,
      cta: { label: "Verify email", url },
      foot: `Link expires in 24 hours. If you didn't sign up, ignore this email.`,
    });
  },
  resetPassword(args: { name: string; token: string }) {
    const url = `${APP_URL}/reset-password?token=${args.token}`;
    return template({
      preview: "Reset your shyftforce password",
      title: `Reset your password`,
      body: `Hi ${args.name}, click the button below to set a new password. If you didn't request this, ignore this email — your password won't change.`,
      cta: { label: "Reset password", url },
      foot: `Link expires in 1 hour.`,
    });
  },
  invite(args: { orgName: string; inviterName: string; token: string }) {
    const url = `${APP_URL}/accept-invite?token=${args.token}`;
    return template({
      preview: `${args.inviterName} invited you to ${args.orgName} on shyftforce`,
      title: `You're invited to ${args.orgName}`,
      body: `${args.inviterName} invited you to join their team on shyftforce — schedules, payroll, time-off, and more in one place.`,
      cta: { label: "Accept invitation", url },
      foot: `Invitation expires in 7 days.`,
    });
  },
  welcome(args: { name: string; orgName: string }) {
    return template({
      preview: `Welcome to shyftforce, ${args.name}`,
      title: `Welcome to ${args.orgName} 🎉`,
      body: `You're all set. Click below to open your workspace and finish onboarding (it takes ~5 minutes).`,
      cta: { label: "Open shyftforce", url: `${APP_URL}/dashboard` },
    });
  },
};

function template(opts: { preview: string; title: string; body: string; cta?: { label: string; url: string }; foot?: string }) {
  const { preview, title, body, cta, foot } = opts;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
<div style="display:none;opacity:0;font-size:0;line-height:0">${preview}</div>
<table align="center" cellpadding="0" cellspacing="0" width="560" style="margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
<tr><td style="padding:24px 28px;border-bottom:1px solid #f1f5f9">
  <span style="font-weight:700;font-size:16px"><span style="display:inline-block;background:#f97316;color:#fff;width:24px;height:24px;border-radius:6px;text-align:center;line-height:24px;margin-right:6px">⚡</span>shyftforce</span>
</td></tr>
<tr><td style="padding:32px 28px">
  <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
  <p style="margin:0 0 24px;line-height:1.55;color:#334155">${body}</p>
  ${cta ? `<a href="${cta.url}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${cta.label}</a>
  <p style="margin-top:16px;font-size:12px;color:#64748b">Or copy this link:<br><a href="${cta.url}" style="color:#ea580c;word-break:break-all">${cta.url}</a></p>` : ""}
  ${foot ? `<p style="margin-top:24px;font-size:12px;color:#94a3b8">${foot}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8">
  shyftforce — workforce management that runs itself.
</td></tr>
</table></body></html>`;
  return html;
}
