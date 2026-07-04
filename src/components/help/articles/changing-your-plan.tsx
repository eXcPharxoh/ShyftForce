import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Upgrading, changing plans, updating your card, cancelling, and grabbing invoices all start in one place: <Link href="/settings/billing" className="text-brand-300 underline">Settings → Billing &amp; plan</Link>. Payments run through Stripe, so your card details never touch our systems.</p>

      <h3>What you&apos;ll see</h3>
      <p>The Billing &amp; plan page shows your current plan, your monthly cost, and your seat usage. Below that is a <b>Change plan</b> grid comparing Pro, Business, and Enterprise with the price at your current headcount, so you can see exactly what each would cost before you switch.</p>

      <h3>Upgrading</h3>
      <Steps>
        <li>Go to <Link href="/settings/billing" className="text-brand-300 underline">Settings → Billing &amp; plan</Link>.</li>
        <li>Click <b>Upgrade to Pro</b> or <b>Upgrade to Business</b>.</li>
        <li>You&apos;re handed to Stripe&apos;s secure checkout. Pay there.</li>
        <li>You land back in ShyftForce and the new plan&apos;s limits unlock right away.</li>
      </Steps>

      <Callout kind="tip" title="On the free trial?">
        During the trial every feature is already unlocked and no card is required. You only need to pick a plan when the trial ends — until then you can explore everything.
      </Callout>

      <h3>Changing plans, updating your card, or cancelling</h3>
      <p>Once you have a paid subscription, the Billing page shows a <b>Manage subscription</b> button. It opens the Stripe billing portal — Stripe&apos;s own secure page — where you can:</p>
      <ul>
        <li>Switch to a different plan</li>
        <li>Update your card or billing details</li>
        <li>Cancel your subscription</li>
        <li>Download past invoices as PDF for your accountant</li>
      </ul>
      <p>Cancelling in the portal ends the subscription at the end of your current billing period, so you keep access until then.</p>

      <h3>Seats</h3>
      <p>Each plan includes a set number of seats and a per-seat price above that. The Billing page shows your seat usage and the cost at your current headcount, and the plan grid previews what any plan would cost as your team grows.</p>

      <Callout kind="warn" title="Enterprise pricing">
        Enterprise is a custom volume contract rather than a self-serve checkout. Use <b>Contact sales for Enterprise</b> on the Billing page (or email <a href="mailto:sales@shyftforce.com" className="text-brand-300 underline">sales@shyftforce.com</a>) and we&apos;ll set it up.
      </Callout>
    </Prose>
  );
}
