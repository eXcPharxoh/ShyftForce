import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Connecting payroll means timesheets, PTO balances, and predictability pay can flow from ShyftForce straight into your payroll system — no copy-paste, no end-of-period spreadsheet wrangling. We use a service called <b>Finch</b> that supports 60+ payroll providers (Gusto, ADP, Paychex, QuickBooks Payroll, Rippling, and many more).</p>

      <h3>What you'll need</h3>
      <ul>
        <li>An active account with one of the supported payroll providers.</li>
        <li>Admin access to that account.</li>
        <li>About 5 minutes.</li>
      </ul>

      <h3>How to connect</h3>
      <Steps>
        <li>Go to <Link href="/settings/integrations" className="text-brand-300 underline">Settings → Integrations</Link>.</li>
        <li>Find the <b>Payroll (via Finch)</b> card and click <b>Connect</b>.</li>
        <li>A popup opens with a search box. Find your payroll provider and click it.</li>
        <li>You'll be redirected to your payroll provider's sign-in page. Sign in like you normally would.</li>
        <li>The provider asks if you want to give ShyftForce read access. Approve. You're redirected back to ShyftForce with a green "Connected" badge.</li>
      </Steps>

      <h3>What syncs</h3>
      <p>Once connected, we automatically pull:</p>
      <ul>
        <li>Your employee list (names, emails, pay rates, hire dates) — we match by email and update what we have.</li>
        <li>Pay period boundaries — so our timesheets line up with your actual pay cycle.</li>
      </ul>
      <p>We can also push timesheets back when you approve a pay period, so you don't have to enter hours in two places.</p>

      <Callout kind="tip" title="Read-only is fine">
        Most customers start with read-only access (we pull employee data, but we don't push anything). When you're confident the data lines up, you can upgrade to read-write so timesheet approvals also push to payroll. Settings → Integrations → Finch.
      </Callout>

      <h3>What about providers Finch doesn't support?</h3>
      <p>If your payroll isn't in the supported list, you can still use ShyftForce — just export timesheets from <Link href="/reports" className="text-brand-300 underline">Reports</Link> as CSV at the end of each pay period and import them manually into your payroll. Not as smooth, but it works for thousands of businesses.</p>

      <h3>Disconnecting</h3>
      <p>Settings → Integrations → Finch → <b>Disconnect</b>. We immediately revoke the access token, and no more data flows. Anything we already pulled stays in your workspace (your employees, your timesheet history) — we don't delete that.</p>
    </Prose>
  );
}
