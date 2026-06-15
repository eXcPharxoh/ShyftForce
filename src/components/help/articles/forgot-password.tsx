import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>You're locked out. No drama — reset takes about 90 seconds.</p>

      <Steps>
        <li>Go to <Link href="/login" className="text-brand-300 underline">the sign-in page</Link>.</li>
        <li>Click <b>Forgot password?</b> right under the password box.</li>
        <li>Type the email you signed up with. Click <b>Send reset link</b>.</li>
        <li>Check that email. You'll get a message from <code>noreply@shyftforce.com</code> with a reset link. (Check spam / promotions tab if it's not in the inbox.)</li>
        <li>Click the link. It opens a page asking for your new password. Use something at least 8 characters long.</li>
        <li>You're done. Sign in with the new password.</li>
      </Steps>

      <Callout kind="tip" title="The link expires in 1 hour">
        For security. If it's been longer, just request a new one — there's no limit on how many resets you can do.
      </Callout>

      <h3>If you have 2-step verification turned on</h3>
      <p>After resetting your password, you'll still need to enter the 6-digit code from your authenticator app to finish signing in. That's normal — resetting the password doesn't disable 2-step.</p>

      <h3>What if I lost my phone too?</h3>
      <p>If you can't get a code from your authenticator (lost phone, broken phone), use one of the <b>recovery codes</b> you saved when you set up 2-step. The sign-in page has a &quot;Use a recovery code instead&quot; link below the code field.</p>
      <p>If you didn't save your recovery codes either, email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a> from the email address on your account. We'll verify your identity by other means (shift history, recent clock-ins, your manager confirming) and turn off 2-step manually so you can sign in.</p>

      <Callout kind="warn" title="Heads up">
        We will never ask for your password over email or chat. If anyone — even someone claiming to be from ShyftForce — asks for your password, don't give it. Real support will only ask you to reset it via the link.
      </Callout>
    </Prose>
  );
}
