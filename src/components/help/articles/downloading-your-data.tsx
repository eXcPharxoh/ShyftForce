import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Your data is yours. Privacy laws (GDPR in Europe, CCPA in California, PIPEDA in Canada) give you the right to download everything we hold about you. We let you do it any time, without asking why.</p>

      <h3>How to download</h3>
      <Steps>
        <li>Go to <Link href="/settings/security" className="text-brand-300 underline">Settings → Security &amp; privacy → Your data is yours</Link>.</li>
        <li>Click <b>Start data export</b>.</li>
        <li>We compile the file in the background — usually under a minute, sometimes a few minutes if your workspace is huge. We'll email you when it's ready.</li>
        <li>Click the download link in the email. The file expires in 7 days.</li>
      </Steps>

      <h3>What's in the file?</h3>
      <p>A single JSON file containing every record we have on you:</p>
      <ul>
        <li>Profile (name, email, phone, hire date, role)</li>
        <li>All your shifts (past and future)</li>
        <li>Clock-in/out history with timestamps and GPS coordinates if recorded</li>
        <li>Time-off requests</li>
        <li>Messages you've sent or received</li>
        <li>Audit log of changes you've made if you're a manager</li>
      </ul>

      <Callout kind="tip" title="What if I want a spreadsheet, not JSON?">
        Most modern spreadsheet tools (Excel, Google Sheets, Numbers) can open JSON directly. If you need a plain CSV, the <Link href="/reports" className="text-brand-300 underline">Reports</Link> page also exports timesheets, members, and shifts as CSV.
      </Callout>

      <h3>Deleting your data</h3>
      <p>From the same page, you can also request account deletion. Here's what happens:</p>
      <ul>
        <li>If you're an <b>employee</b>: your account is deactivated immediately. Your historical shifts and timesheets stay in your employer's records (they need them for payroll history and labor-law audits).</li>
        <li>If you're the <b>owner of the workspace</b>: we mark the workspace for deletion. You have 30 days to change your mind, then we permanently remove everything.</li>
      </ul>

      <Callout kind="warn" title="Some things stick around because the law says so">
        Wage and timesheet records have to be kept for 3–7 years depending on your jurisdiction. We can't delete those — but they're isolated from your active profile and only accessible to your employer for legal compliance.
      </Callout>
    </Prose>
  );
}
