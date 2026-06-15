import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>If you run a restaurant, bar, or cafe with tipped staff, you probably need to pool tips and distribute them fairly. ShyftForce has a built-in tip pooling engine that handles the math, weighting, and IRS Form 8027 reporting at year-end.</p>

      <h3>What pool types we support</h3>
      <ul>
        <li><b>Even split</b> — total pooled tips ÷ number of tipped staff present.</li>
        <li><b>By hours worked</b> — heavier earners on longer shifts get more.</li>
        <li><b>By role weight</b> — assign a multiplier per role (server 1.0, busser 0.5, runner 0.7). Total is shared in proportion.</li>
        <li><b>Hybrid</b> — combine hours × role weight. Most common in fine dining.</li>
      </ul>

      <h3>Setting up your first tip pool</h3>
      <Steps>
        <li>Go to <Link href="/tips" className="text-brand-300 underline">Tip Pooling</Link>.</li>
        <li>Click <b>Create pool</b>. Name it (e.g. &quot;Front of house — dinner&quot;) and pick the pool type.</li>
        <li>If you chose role weights, set them: typically Server 1.0, Bartender 0.8, Busser 0.5, Food runner 0.7, Host 0.3.</li>
        <li>Set the eligibility — which positions can participate, which locations and shift types it covers.</li>
        <li>Save.</li>
      </Steps>

      <h3>How tips get into the pool</h3>
      <p>Three ways, depending on your setup:</p>
      <ul>
        <li><b>Daily entry</b> — a manager types in the total tips collected for the shift at end of day. We compute distributions overnight.</li>
        <li><b>From POS sync</b> — if you've connected your register and your POS tracks tips per transaction, we pull them automatically.</li>
        <li><b>Per-employee entry</b> — for cash tips that go straight to staff, the employee enters their amount in the app at end of shift.</li>
      </ul>

      <h3>Tip-out reports for payroll</h3>
      <p>End of each pay period, the Tip Pooling page generates a <b>tip distribution report</b> showing every employee's allocated tips, owed or owed-to amounts, and the calculation method. Export it as CSV for your payroll provider, or push directly via the Finch integration.</p>

      <Callout kind="tip" title="IRS Form 8027 (Restaurants with 10+ employees)">
        US restaurants with 10+ tipped employees have to file IRS Form 8027 annually showing total receipts, charged tips, and allocated tips. We auto-generate the form data from your tip pool history — go to <Link href="/tips" className="text-brand-300 underline">Tip Pooling → Reports → IRS 8027</Link>. Saves a few hours every January.
      </Callout>

      <Callout kind="warn" title="Tip credit rules (states with tipped minimum wage)">
        If you take a tip credit (paying tipped staff under regular minimum wage with tips making up the difference), you have specific notice and recordkeeping requirements. We handle the recordkeeping but you should review your state's notice rule once — the <Link href="/help/state-by-state-labor-laws" className="text-brand-300 underline">state-by-state reference</Link> has the highlights.
      </Callout>
    </Prose>
  );
}
