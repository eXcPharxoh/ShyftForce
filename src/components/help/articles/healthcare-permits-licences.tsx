import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Healthcare, security, and field-service operators have one painful constant: people can&apos;t work if their license expired yesterday. ShyftForce tracks every permit and license, reminds you (and the employee) well before they expire, and — for permits you mark as blocking — stops an employee from being scheduled once theirs lapses.</p>

      <h3>Permit categories built in</h3>
      <p>The New Permit dialog has presets for the common ones, pre-filled with sensible defaults you can override:</p>
      <ul>
        <li><b>RN / LPN / LVN license</b> — nursing, state-by-state</li>
        <li><b>BLS / CPR</b> and <b>ACLS</b> — life-support certs</li>
        <li><b>Security guard permit</b> and <b>Firearm permit</b> — usually separate</li>
        <li><b>Forklift</b>, <b>OSHA 10/30</b>, <b>Food handler</b>, <b>CDL</b>, <b>Alcohol service</b></li>
        <li><b>Agency-level licenses</b> — the company&apos;s own operating license or bond (no employee attached)</li>
        <li><b>Custom</b> — define your own with a name, expiry date, and whether it blocks scheduling</li>
      </ul>

      <h3>Adding a permit</h3>
      <Steps>
        <li>Go to <Link href="/settings/permits" className="text-brand-300 underline">Settings → Permits &amp; licences</Link>.</li>
        <li>Click <b>Add permit</b> and pick the category.</li>
        <li>Choose the employee (or leave blank for an agency-level license).</li>
        <li>Enter the permit number, issue date, expiry date, and optionally the annual fee and a renewal link.</li>
        <li>Turn on <b>Blocks scheduling</b> if this permit is required to work — then an expired one takes the employee out of the schedule. Save.</li>
      </Steps>

      <h3>How reminders work</h3>
      <p>A daily job checks every permit and sends a reminder as expiry approaches:</p>
      <ul>
        <li><b>60 &amp; 30 days</b> before — a heads-up to admins (and the employee) to start the renewal.</li>
        <li><b>14 &amp; 7 days</b> before — escalating reminders to the admins and the affected employee.</li>
        <li><b>Day-of</b> — expires today.</li>
        <li><b>After expiry</b> — every manager is notified, and if the permit blocks scheduling, that employee can no longer be scheduled.</li>
      </ul>

      <Callout kind="warn" title="Blocks scheduling is a per-permit switch">
        Auto-block only applies to permits where you turned on <b>Blocks scheduling</b>. If you&apos;re waiting on paperwork and want to keep someone on the schedule, leave that switch off for their permit — you&apos;ll still get the expiry reminders, but they won&apos;t be pulled from shifts.
      </Callout>

      <h3>Seeing where you stand</h3>
      <p>The <Link href="/settings/permits" className="text-brand-300 underline">Permits &amp; licences</Link> page lists every permit with its current status and expiry date, flags the ones that block scheduling, and totals your annual permit fees so you can budget renewals. Expiring permits also surface on the dashboard so nothing sneaks up on you.</p>
    </Prose>
  );
}
