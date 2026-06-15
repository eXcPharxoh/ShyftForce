import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Upgrading, downgrading, adding seats, or cancelling — all of it happens in one place: <Link href="/settings/billing" className="text-brand-300 underline">Settings → Billing &amp; plan</Link>. Changes take effect immediately and we pro-rate the bill so you only pay for what you used.</p>

      <h3>Upgrading</h3>
      <Steps>
        <li>Go to <Link href="/settings/billing" className="text-brand-300 underline">Settings → Billing &amp; plan</Link>.</li>
        <li>Click <b>Compare plans</b>.</li>
        <li>Pick the plan you want (Pro or Business).</li>
        <li>Click <b>Upgrade</b>. We hand you to Stripe's secure checkout. Your card info never touches our systems.</li>
        <li>Pay. You're back in ShyftForce in 30 seconds. The new features unlock immediately.</li>
      </Steps>

      <h3>Downgrading</h3>
      <p>Same place. Pick the lower plan and click <b>Downgrade</b>. The change takes effect at the end of your current billing period — you don't lose access to the higher-plan features mid-month.</p>
      <p>If you downgrade past a feature you're using (e.g. you're on Business with 4 locations and downgrade to Pro which only includes 1), we don't delete your data. The feature just becomes read-only until you re-upgrade or remove what's over the limit.</p>

      <h3>Adding or removing seats</h3>
      <p>Your seat count auto-adjusts based on how many active employees you have. Add 5 employees, your next bill includes those 5 seats. Deactivate 3 employees, your next bill is smaller. No need to manage seats manually.</p>
      <p>If a seat charge happens on the same day as a deactivation, we pro-rate to the hour — you don't pay for a seat you didn't really use.</p>

      <Callout kind="tip" title="Seasonal businesses">
        If you're a seasonal operation (summer-only restaurant, holiday retail), you can <b>pause your workspace</b> instead of cancelling. Pausing keeps your data intact for $5/month and reactivates instantly when you're ready. Cancelling deletes everything after 30 days.
      </Callout>

      <h3>Cancelling</h3>
      <Steps>
        <li>Settings → Billing &amp; plan.</li>
        <li>Scroll to the bottom. Click <b>Cancel subscription</b>.</li>
        <li>You'll be asked why (helps us improve) but you can skip it.</li>
        <li>Confirm. Your subscription ends at the end of the current billing period — you keep access until then.</li>
        <li>After it ends, you have <b>30 days</b> to download a full export of your data or reactivate. After 30 days, your workspace is permanently deleted.</li>
      </Steps>

      <Callout kind="warn" title="What about employee records you're required to keep?">
        Wage and timesheet records have a legal retention period (typically 3–7 years in the US). When you cancel, you can request an extended retention plan that keeps just those records (no active features) for the required period at a reduced rate. Message <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a> if you need this.
      </Callout>

      <h3>Invoices</h3>
      <p>Every charge shows up in <b>Settings → Billing &amp; plan → Invoices</b>. Each one is downloadable as PDF for your accountant.</p>
    </Prose>
  );
}
