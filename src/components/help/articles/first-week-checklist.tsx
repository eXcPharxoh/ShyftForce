import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>If you're new to ShyftForce, the path from signup to your team clocking in is shorter than you'd think. Here's the five-step playbook most managers follow on day one.</p>

      <Steps>
        <li>
          <b>Pick your industry.</b> On signup we pre-fill the positions, default shift lengths, compliance rules, and even sample shifts for your industry — restaurants, retail, security, healthcare, and more. You can change anything later.
        </li>
        <li>
          <b>Add your first location.</b> Type the address and we draw a clock-in zone around it. People have to be inside it to punch in, so no one clocks in from home. Default size is 100 meters (about a city block) — adjust if your site is bigger.
        </li>
        <li>
          <b>Invite your team.</b> Three ways: one at a time, paste a list of emails, or upload a spreadsheet. They get an email link to set up their own password. See <Link href="/help/inviting-your-team" className="text-brand-300 underline">Inviting your team</Link>.
        </li>
        <li>
          <b>Build this week's schedule.</b> Either drag shifts onto the grid yourself, click <b>Auto-Schedule</b> and the AI drafts a week from your settings, or just open the assistant (⌘K) and type something like &quot;need 2 cashiers Monday 9-5.&quot;
        </li>
        <li>
          <b>Publish.</b> Hit <b>Publish week</b>. Your team gets the schedule as a push notification, email, or SMS depending on what they've turned on.
        </li>
      </Steps>

      <Callout kind="tip" title="One thing most people skip">
        Tell your team to <Link href="/help/install-mobile-app" className="text-brand-300 underline">install ShyftForce on their phone</Link> on day one. It works like a regular app, alerts them to shift changes, and lets them clock in from their pocket. Adoption goes way up.
      </Callout>

      <h3>What if I get stuck?</h3>
      <p>The blue assistant button at the top of every page (or ⌘K on your keyboard) can answer most questions and even do things for you — &quot;create a manager role,&quot; &quot;send Sarah a message,&quot; &quot;what's my labor cost this week?&quot; — try it.</p>
    </Prose>
  );
}
