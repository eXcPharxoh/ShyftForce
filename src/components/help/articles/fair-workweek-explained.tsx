import Link from "next/link";
import { Prose, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Fair Workweek (sometimes called &quot;predictive scheduling&quot;) is a law in some US cities that says employees deserve advance notice of their schedule. If you change a shift at the last minute, you may owe the employee extra money — called <b>predictability pay</b>.</p>

      <h3>Where it applies</h3>
      <p>Right now (2026), Fair Workweek laws are in effect in:</p>
      <ul>
        <li><b>New York City</b> — retail and fast food</li>
        <li><b>Seattle, WA</b> — retail and food service, 500+ employees globally</li>
        <li><b>Oregon (statewide)</b> — retail, hospitality, food service, 500+ employees</li>
        <li><b>Chicago, IL</b> — most industries, 100+ employees</li>
        <li><b>Philadelphia, PA</b> — retail, hospitality, food service, 250+ employees</li>
        <li><b>Los Angeles, CA</b> — retail, 300+ employees</li>
        <li><b>Berkeley, Emeryville, San Francisco</b> — local versions</li>
      </ul>
      <p>The rules vary by city — what triggers a penalty in NYC isn't the same as Chicago. We pick up the right preset based on your location when you pick your industry during signup.</p>

      <h3>What triggers predictability pay</h3>
      <p>The common patterns across all cities:</p>
      <ul>
        <li><b>Publishing less than 14 days in advance</b> — the employee is owed extra for the surprise.</li>
        <li><b>Changing a published shift</b> — moving, shortening, lengthening, or cancelling.</li>
        <li><b>Adding hours to a published schedule</b> — &quot;can you also work Friday?&quot; counts.</li>
        <li><b>Sending someone home early</b> — pay for the rest of the shift they would have worked.</li>
        <li><b>Clopening</b> — closing one night and opening the next morning with less than the required rest in between (usually 10–11 hours).</li>
      </ul>

      <h3>How ShyftForce helps</h3>
      <p>On the <Link href="/compliance" className="text-brand-300 underline">Compliance</Link> page, we run your draft schedule through the Fair Workweek rules for your city before you publish. Any predictability-pay events get flagged with the rule, the cost, and the affected employee. You can resolve each one (pay the penalty, adjust the schedule, or override with a note) before you publish.</p>

      <Callout kind="warn" title="The obligation is yours, not ours">
        We flag and calculate. We don't pay. The actual predictability pay has to go on the employee's paycheck — work with your payroll provider to add it as a line item, or use the Finch integration to push it through automatically.
      </Callout>

      <h3>Exemptions</h3>
      <p>The laws have specific exceptions — emergency operations, customer-requested changes, employee-requested swaps. The Compliance page lets you mark a flagged event as exempt with a reason; it stays in the audit log for if you're ever audited.</p>
    </Prose>
  );
}
