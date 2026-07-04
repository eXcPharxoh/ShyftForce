import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>If you run a construction site, daily safety briefings (sometimes called &quot;toolbox talks&quot;) aren&apos;t optional — OSHA expects them and your insurance carrier almost certainly does too. ShyftForce has a built-in briefing system: the foreman posts the day&apos;s topic, every crew member acknowledges it before they can clock in, and you get a dated record of who acknowledged what.</p>

      <h3>How a briefing day works</h3>
      <Steps>
        <li>Morning of: a manager or foreman opens <b>Safety</b> and posts today&apos;s briefing — a short <b>topic</b> (e.g. &quot;Fall protection near grid 3&quot;) and a <b>details</b> note with whatever the crew needs to know.</li>
        <li>When a crew member goes to clock in, ShyftForce checks for any briefing posted in the last 16 hours they haven&apos;t acknowledged. If there is one, the clock-in screen shows it and asks them to <b>acknowledge</b> first.</li>
        <li>They tap <b>I acknowledge &amp; clock in</b>. We record who acknowledged, which briefing, and the timestamp — then complete their clock-in.</li>
        <li>On the Safety page you see each briefing with a live list of who has acknowledged and who hasn&apos;t yet.</li>
      </Steps>

      <Callout kind="tip" title="It really blocks the clock-in">
        This isn&apos;t a reminder they can dismiss. If a briefing is posted and unacknowledged, the person can&apos;t clock themselves in until they acknowledge it. (A manager correcting someone else&apos;s punch is never blocked by it.)
      </Callout>

      <h3>Writing the briefing</h3>
      <p>The topic and details are free text — write whatever fits today&apos;s site. A near-miss debrief, a JSA summary for a specific task, a weather note, an incident-driven retraining. Keep it short; the crew reads it on their phone at clock-in.</p>

      <h3>Who can post</h3>
      <p>Any manager-role can post a briefing. If you want it foreman-only (no office-based managers), create a custom role in <Link href="/settings" className="text-brand-300 underline">Settings → Roles &amp; permissions</Link> and remove the permission from the corporate role.</p>

      <h3>The paper trail</h3>
      <p>Every acknowledgment is stored with the member and timestamp, so if you&apos;re asked to show that the crew was briefed, the Safety page has the record per briefing. Acknowledgments stay attached to each day&apos;s briefing.</p>

      <Callout kind="warn" title="Acknowledgment isn't training">
        A toolbox-talk acknowledgment is NOT a substitute for documented OSHA 10 or 30 training. Workers still need their certifications — track those in the <Link href="/help/healthcare-permits-licences" className="text-brand-300 underline">Certifications and licenses</Link> section.
      </Callout>
    </Prose>
  );
}
