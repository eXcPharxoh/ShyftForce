import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Healthcare, security, and field-service operators have one painful constant: people can't work if their license expired yesterday. ShyftForce tracks every permit and license per employee, reminds you before they expire, and blocks them from scheduling shifts that require something they no longer hold.</p>

      <h3>Permit categories we ship</h3>
      <p>Out of the box, we have presets for the common ones:</p>
      <ul>
        <li><b>RN license</b> — registered nurse, state-by-state</li>
        <li><b>LPN/LVN license</b> — licensed practical nurse</li>
        <li><b>BLS / CPR</b> — basic life support, typically 2-year cycle</li>
        <li><b>ACLS</b> — advanced cardiac life support, 2-year</li>
        <li><b>State guard license</b> — security guard certification</li>
        <li><b>Firearm permit</b> — separate from guard license in most states</li>
        <li><b>Forklift</b>, <b>OSHA 10/30</b>, <b>Food handler</b> — for warehouse, field, restaurant</li>
        <li><b>Custom</b> — define your own with a name, expiry rule, and which positions require it</li>
      </ul>

      <h3>Adding a permit to an employee</h3>
      <Steps>
        <li>Go to <Link href="/hr/members" className="text-brand-300 underline">Your team → click the employee → Permits tab</Link>.</li>
        <li>Click <b>Add permit</b>. Pick the category.</li>
        <li>Enter the permit number, issue date, expiry date, and optionally upload a scan of the certificate.</li>
        <li>Save. Done.</li>
      </Steps>

      <h3>How reminders work</h3>
      <p>We send the employee (and their manager) a reminder:</p>
      <ul>
        <li><b>60 days</b> before expiry — &quot;Renew time. Schedule the CE/recert.&quot;</li>
        <li><b>30 days</b> before — &quot;Have you started?&quot;</li>
        <li><b>7 days</b> before — &quot;This is urgent.&quot;</li>
        <li><b>Day-of</b> — &quot;Expires today. After today they can't work shifts requiring this.&quot;</li>
        <li><b>Day-after</b> — manager only, &quot;X's permit expired yesterday. Block from shifts?&quot;</li>
      </ul>

      <Callout kind="warn" title="Auto-block on expiry">
        By default, when a permit expires we <b>block</b> the employee from being assigned to any shift requiring that permit. The shift becomes open and the marketplace can fill it. You can override on a per-employee basis if you're waiting on paperwork — there's a 7-day grace flag.
      </Callout>

      <h3>Which shifts &quot;require&quot; a permit?</h3>
      <p>When you create a position (e.g. &quot;ICU nurse&quot;), you can attach required permits. Any shift assigned to that position then inherits the requirement, and we won't let you assign someone who doesn't currently hold it.</p>

      <h3>Compliance audit reports</h3>
      <p>For healthcare and security operators, regulators and clients sometimes audit your permit records. The <Link href="/reports" className="text-brand-300 underline">Reports</Link> page exports a per-employee, per-permit history showing current status, expiry dates, and historical renewals — usually accepted as-is by auditors.</p>
    </Prose>
  );
}
