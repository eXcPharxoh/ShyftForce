import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>You can add people to your workspace three different ways. Pick whichever fits your situation.</p>

      <h3>One at a time</h3>
      <Steps>
        <li>Go to <Link href="/hr/members" className="text-brand-300 underline">Your team</Link>.</li>
        <li>Click <b>Invite</b> in the top right.</li>
        <li>Type their email and (optionally) the location and position you'll mostly schedule them for.</li>
        <li>They get an email with a link. When they click it, they set their own password and fill in their phone number and availability.</li>
      </Steps>

      <h3>Paste a list</h3>
      <p>If you have 5+ people to add, the &quot;Invite by paste&quot; mode lets you drop a comma-separated or one-per-line list of emails. We send each one an invite. Much faster than the form for bigger teams.</p>

      <h3>Upload a spreadsheet</h3>
      <p>Click <b>Import CSV</b> on the team page. Your spreadsheet needs at minimum a column called <code>email</code>. Optional columns we'll read: <code>name</code>, <code>phone</code>, <code>position</code>, <code>locationName</code>, <code>hireDate</code>, <code>hourlyRate</code>. Mismatched column names are flagged — we don't import bad rows.</p>

      <Callout kind="tip" title="Coming from another scheduling app?">
        Sling, When I Work, Deputy, and Homebase all let you export your team as a CSV. Download that file, then drop it into the import here — we'll figure out the mapping.
      </Callout>

      <h3>What happens after they're invited?</h3>
      <p>They show up in your team list as <b>Pending</b> until they accept the invite. While pending they can't be assigned to shifts. Once they click the link in their email and finish setup, they're <b>Active</b> and you can put them on the schedule.</p>

      <Callout kind="warn" title="They didn't get the email?">
        Check your spam folder first. Then check that they typed their email right (it's case-insensitive but no typos in the domain). If nothing works, contact <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a> — we can resend manually.
      </Callout>
    </Prose>
  );
}
