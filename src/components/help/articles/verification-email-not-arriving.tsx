import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>You signed up, we said &quot;check your email,&quot; and… nothing. Walk through these in order — almost always one of them works.</p>

      <h3>Step 1: Check your spam / junk folder</h3>
      <p>This catches 80% of cases. Look for an email from <code>noreply@shyftforce.com</code>. If you find it there, mark it as &quot;Not spam&quot; or move it to your inbox so future emails go to the right place.</p>

      <h3>Step 2: Check your &quot;Promotions&quot; or &quot;Updates&quot; tab (Gmail)</h3>
      <p>Gmail sorts new senders into the Promotions tab by default. Click that tab and search for &quot;ShyftForce.&quot;</p>

      <h3>Step 3: Make sure you typed the right email</h3>
      <p>Common typos: <code>gnail.com</code> (instead of <code>gmail.com</code>), missing <code>@</code>, extra spaces. Go back to <a href="/signup" className="text-brand-300 underline">/signup</a> and try again with the right address.</p>

      <h3>Step 4: Try a different email provider</h3>
      <p>Some corporate firewalls block new senders entirely. If you signed up with a work address and nothing's arriving, try a personal Gmail / Yahoo / iCloud and see if that one comes through.</p>

      <h3>Step 5: Resend the email</h3>
      <p>On the <b>verify your email</b> page (where you landed right after signup), there's a <b>Resend email</b> button. Tap it. Wait two minutes.</p>

      <Callout kind="warn" title="Still nothing after 15 minutes?">
        Email us at <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a> with the email address you tried to sign up with. We'll verify your account manually within a few hours and let you in.
      </Callout>

      <h3>Once you're in</h3>
      <p>Add <code>noreply@shyftforce.com</code> to your contacts (in Gmail, Outlook, Apple Mail — it's a one-click thing). Future emails like password resets, shift changes, and time-off updates will go straight to your inbox.</p>
    </Prose>
  );
}
