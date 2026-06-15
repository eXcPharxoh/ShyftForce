import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>To clock in, open the ShyftForce app on your phone and tap the big blue <b>Clock In</b> button at the top of the screen. That's it.</p>

      <h3>What happens behind the scenes</h3>
      <p>When you tap Clock In, your phone shares your location with the app (one-time, only for this punch). We check whether you're inside the clock-in zone for the location you're scheduled at. If yes, you're clocked in and your shift timer starts.</p>

      <h3>Your phone will ask for permission the first time</h3>
      <Steps>
        <li>Tap <b>Clock In</b>.</li>
        <li>Your phone pops up: <i>&quot;Allow ShyftForce to use your location?&quot;</i>. Tap <b>Allow While Using App</b> (or just &quot;Allow&quot;).</li>
        <li>You only have to do this once per device. After that, every clock-in just works.</li>
      </Steps>

      <Callout kind="warn" title="Don't tap &quot;Don't Allow&quot;">
        If you accidentally deny location access, the Clock In button won't work. To fix it on iPhone: <b>Settings → Privacy &amp; Security → Location Services → Safari Websites → app.shyftforce.com → Allow</b>. On Android: <b>Chrome → app.shyftforce.com → Permissions → Location → Allow</b>.
      </Callout>

      <h3>Taking a break</h3>
      <p>Same button — once you're clocked in, it turns into <b>Start Break</b>. Tap when you start, tap <b>End Break</b> when you come back. We don't count break time toward your hours.</p>

      <h3>Clocking out</h3>
      <p>Tap <b>Clock Out</b> when you're done. The button changes color so you can tell at a glance whether you're on the clock or not.</p>

      <h3>What if you forgot to clock in?</h3>
      <p>Message your manager — they can add a punch for you from the <Link href="/attendance" className="text-brand-300 underline">Attendance</Link> page. We log it as a manual adjustment so there's a trail.</p>

      <Callout kind="tip" title="Selfie clock-in">
        Some employers turn on selfie verification — you snap a quick photo when clocking in to confirm it's really you. It's optional per workspace; your manager will tell you if it's on. The photo is only used for verification and is deleted after a few months.
      </Callout>
    </Prose>
  );
}
