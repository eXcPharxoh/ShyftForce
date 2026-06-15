import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>When an employee submits a time-off request, you'll see it on your dashboard's <b>"Do this next"</b> card and in the Time off page. Decisions take about a minute.</p>

      <Steps>
        <li>Open <Link href="/time-off" className="text-brand-300 underline">Time off</Link>. Pending requests are at the top.</li>
        <li>Tap a request to see the details: dates, category, current balance, and any conflicting shifts.</li>
        <li>If there's a conflict (they're scheduled to work during their requested time off), you'll see those shifts highlighted. Decide if you'll remove them from the shift or keep them on it.</li>
        <li>Tap <b>Approve</b> or <b>Decline</b>. You can add a note that goes to the employee.</li>
        <li>Done. The employee gets a notification immediately. If approved, the hours come out of their balance.</li>
      </Steps>

      <h3>What if they're scheduled during the time off?</h3>
      <p>When you approve a request that overlaps shifts, we ask: <b>Remove from shift?</b> or <b>Keep on shift?</b></p>
      <ul>
        <li><b>Remove from shift</b> — the shift becomes open and the marketplace can auto-offer it to someone else. This is the usual choice.</li>
        <li><b>Keep on shift</b> — they're approved for time off but you've agreed they'll work this one anyway (maybe they're going to a wedding evening and can do the morning shift). The shift stays assigned.</li>
      </ul>

      <Callout kind="tip" title="Blackout periods">
        If you've set <Link href="/settings/time-off-blackouts" className="text-brand-300 underline">time-off blackouts</Link> (e.g. Black Friday week for retail), requests that fall inside those dates are flagged so you don't accidentally approve someone off during your busiest time.
      </Callout>

      <h3>Declining</h3>
      <p>If you have to say no, add a reason — even something short like &quot;Already approved 3 people for that week, need to balance.&quot; Saves a follow-up conversation and helps the employee plan a different date.</p>

      <h3>Bulk approval</h3>
      <p>If you have 5+ requests piling up, the Time off page has a <b>Select all</b> checkbox and a <b>Bulk approve</b> action. Good for clearing the queue when nothing's controversial.</p>
    </Prose>
  );
}
