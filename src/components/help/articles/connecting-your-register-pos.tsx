import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Connecting your register (point-of-sale system) lets ShyftForce pull in your sales data so we can show you <b>labor cost as a % of sales in real time</b> — and tell you when you can safely send somebody home to save money.</p>

      <h3>Why bother?</h3>
      <p>If you don't track labor vs sales, you're flying blind on profitability. The two patterns we catch:</p>
      <ul>
        <li><b>Overstaffed during a slow day</b> — you're paying 4 people to stand around when 2 could handle it. Live labor % shows you, the assistant suggests who to send home.</li>
        <li><b>Understaffed during a rush</b> — sales are climbing faster than your roster. Better to call somebody in than lose orders.</li>
      </ul>

      <h3>What we support</h3>
      <p>Right now: <b>manual entry</b> (you type in daily sales, no connection needed). Toast, Square, and Clover are in early access — message support if you want them turned on for your workspace.</p>

      <h3>Manual entry — the fastest start</h3>
      <Steps>
        <li>Go to <Link href="/settings/pos" className="text-brand-300 underline">Settings → Your register &amp; sales</Link>.</li>
        <li>Click <b>Connect your register</b>.</li>
        <li>In the Provider dropdown, leave it on <b>Manual entry</b>.</li>
        <li>Pick the location it's for. Click <b>Connect</b>.</li>
        <li>You're done. Go to the Live Labor page and type in today's gross sales — labor % updates immediately.</li>
      </Steps>

      <Callout kind="tip" title="Manual is underrated">
        For a small restaurant or retail shop, typing in one number at end of day takes 20 seconds. You don't need a fancy integration to get the value. Once you've got the daily habit, the real-time integration is a nice-to-have.
      </Callout>

      <h3>Early access — Toast, Square, Clover</h3>
      <p>We have the integration code for these providers but haven't fully launched it yet. If you want it, email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a> with the provider you use — we'll get you a long-lived access code (also called an &quot;API key&quot;) from your POS and walk you through the rest in about 15 minutes.</p>

      <h3>What we read</h3>
      <p>For all providers: only daily sales totals per location. We don't see individual orders, customer info, payment details, or anything beyond what's needed to compute labor%.</p>
    </Prose>
  );
}
