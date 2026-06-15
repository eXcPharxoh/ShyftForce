import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>If you run a construction site, daily safety briefings (sometimes called &quot;toolbox talks&quot;) aren't optional — OSHA requires them and your insurance carrier almost certainly does too. ShyftForce has a built-in briefing system: post the topic, your crew acknowledges it from the app before clocking in, and you get an audit-ready record.</p>

      <h3>How a briefing day works</h3>
      <Steps>
        <li>Morning of: the foreman creates today's briefing in the app. Picks a topic from the library (ladders, fall protection, hot work, confined space, etc.) or types a custom one.</li>
        <li>The briefing details and any PDF (safety poster, MSDS, JSA) are attached.</li>
        <li>When a crew member tries to clock in, they're prompted: <b>&quot;Acknowledge today's safety briefing?&quot;</b> with the topic and content shown.</li>
        <li>They tap <b>I acknowledge</b>. They're clocked in. We log: which employee, which briefing, timestamp, GPS, optionally a typed initials field.</li>
        <li>End of day: every clock-in has an acknowledgment attached. If anyone clocked in without acknowledging (rare — the modal blocks until done), the gap is flagged.</li>
      </Steps>

      <h3>What's in the topic library</h3>
      <p>We ship 30+ pre-written toolbox talks aligned to OSHA's most-cited construction topics:</p>
      <ul>
        <li>Fall protection (the #1 OSHA cited topic)</li>
        <li>Scaffolding</li>
        <li>Ladders</li>
        <li>Eye and face protection</li>
        <li>Respiratory protection</li>
        <li>Hazard communication (HazCom)</li>
        <li>Lockout/tagout</li>
        <li>Excavation</li>
        <li>Hot work and welding</li>
        <li>Heat illness prevention (required in CA, WA, OR, NV, CO)</li>
        <li>Plus topics for confined space, electrical, cranes, demolition, asbestos, lead, silica, noise</li>
      </ul>

      <p>Each is a short markdown document you can edit before posting. Add your site-specific notes (&quot;today watch for the rebar exposed near grid 3&quot;) without rewriting the whole thing.</p>

      <h3>Custom topics</h3>
      <p>For something specific (a JSA for a particular task, a near-miss debrief, an incident-driven retraining), create a custom topic. Same flow — write the content, attach any documents, post.</p>

      <Callout kind="tip" title="Run by foreman, not corporate">
        Safety culture works best when the foreman owns the briefing. We default to letting any manager-role create briefings. If you want it foreman-only (no office-based managers), use a custom role (Settings → Roles &amp; permissions) and remove the permission from the corporate role.
      </Callout>

      <h3>The OSHA paper trail</h3>
      <p>If you're inspected, the Compliance Reports page exports a per-day, per-site briefing log showing the topic, attendees, and acknowledgment timestamps. Comes as PDF, printable. Usually accepted as-is by OSHA inspectors and your insurance carrier's auditor.</p>

      <Callout kind="warn" title="Acknowledgment isn't training">
        A toolbox talk acknowledgment is NOT a substitute for documented OSHA 10 or 30 training. Workers still need their certifications, and we track those separately in the <Link href="/help/healthcare-permits-licences" className="text-brand-300 underline">Permits and licenses</Link> section.
      </Callout>
    </Prose>
  );
}
