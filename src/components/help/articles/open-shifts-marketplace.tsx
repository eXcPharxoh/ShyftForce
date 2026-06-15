import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>An &quot;open shift&quot; is a shift on the schedule with nobody assigned to it. Usually it's there because somebody called out, you opened it deliberately to fill, or you imported a draft and haven't decided who's working it yet.</p>

      <h3>How the marketplace fills it</h3>
      <p>When you mark a shift as open (or auto-mark it via a callout), we send offers to your best-fit team members in <b>three waves</b>:</p>

      <Steps>
        <li><b>Wave 1</b> — top 3 candidates based on availability, position match, and recent hours. They have 30 minutes to claim.</li>
        <li><b>Wave 2</b> — next 5 candidates. Another 30 minutes.</li>
        <li><b>Wave 3</b> — open to everyone qualified. 60 minutes.</li>
      </Steps>

      <p>First person to tap <b>Claim</b> wins. We immediately confirm them, expire the other offers, and notify them they got it.</p>

      <h3>Why waves instead of mass-blasting?</h3>
      <p>Mass-blasts train your team to ignore notifications. The wave system gives your most reliable people first dibs and only escalates when needed. It also prevents 14 people from all claiming the same shift in the same minute.</p>

      <Callout kind="tip" title="Auto-callout for no-shows">
        If you turn on <b>Coverage Autopilot</b> in <Link href="/schedule/coverage" className="text-brand-300 underline">Coverage Center</Link>, we'll automatically convert any no-show into an open shift and start the wave process. Your phone doesn't ring at 5am.
      </Callout>

      <h3>What if nobody claims it?</h3>
      <p>After wave 3 expires, we DM all your managers a &quot;Coverage escalation&quot; alert with the shift details and a link to the coverage center. From there you can either reassign manually, mark it as canceled, or post it to the worker network (if you have the Business plan).</p>
    </Prose>
  );
}
