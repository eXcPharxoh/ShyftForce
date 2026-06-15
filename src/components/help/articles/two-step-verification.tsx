import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>2-step verification (also called 2FA or two-factor) adds a second password step to signing in. Even if someone gets hold of your password, they can't sign in without your phone. It takes about two minutes to set up.</p>

      <h3>You'll need</h3>
      <ul>
        <li>An authenticator app on your phone. Free options: <b>Google Authenticator</b>, <b>Authy</b>, <b>Microsoft Authenticator</b>, or <b>1Password</b> if you already use it. Any of them works.</li>
        <li>About 2 minutes.</li>
      </ul>

      <h3>Set it up</h3>
      <Steps>
        <li>Sign in to ShyftForce on your computer (easier than on a phone for this).</li>
        <li>Go to <Link href="/settings/security" className="text-brand-300 underline">Settings → Security &amp; privacy</Link>.</li>
        <li>Click <b>Turn on 2-step verification</b>. A QR code appears on screen.</li>
        <li>Open your authenticator app on your phone, tap the <b>+</b> button, and scan the QR code with your camera.</li>
        <li>Your app now shows a 6-digit code that changes every 30 seconds. Type the current code back into ShyftForce and click <b>Verify</b>.</li>
        <li>We give you a list of <b>recovery codes</b>. Save these somewhere safe (password manager, printed and kept in a drawer). If you ever lose your phone, these are how you get back in.</li>
      </Steps>

      <Callout kind="warn" title="Save the recovery codes for real">
        If you lose your phone AND don't have the recovery codes, the only way to recover the account is to email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a> and verify your identity manually. That can take a few days. Don't skip this step.
      </Callout>

      <h3>From now on, signing in works like this</h3>
      <Steps>
        <li>Type your email and password as usual.</li>
        <li>We ask for a 6-digit code. Open your authenticator app on your phone, read the current code, type it.</li>
        <li>You're in. The code changes every 30 seconds, so don't take too long.</li>
      </Steps>

      <h3>Turning it off</h3>
      <p>Same page in Settings. We'll ask for your password to confirm before turning it off — so a friend who borrowed your laptop can't disable it.</p>
    </Prose>
  );
}
