import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>You tapped Clock In and something's not right. Here are the two most common reasons in order.</p>

      <h3>Reason 1: Your phone won't share its location</h3>
      <p>By far the most common. The Clock In button needs to know where you are to confirm you're at the location.</p>

      <h4>Fix on iPhone</h4>
      <Steps>
        <li>Open the <b>Settings</b> app on your phone (the grey gear icon).</li>
        <li>Tap <b>Privacy &amp; Security</b>.</li>
        <li>Tap <b>Location Services</b> at the top.</li>
        <li>Make sure the master switch is <b>on</b> (green).</li>
        <li>Scroll down and find <b>Safari Websites</b> (or the ShyftForce app if you installed it). Tap it.</li>
        <li>Choose <b>While Using the App</b> or <b>Always</b>.</li>
        <li>Go back to ShyftForce and tap Clock In again.</li>
      </Steps>

      <h4>Fix on Android</h4>
      <Steps>
        <li>Open Chrome.</li>
        <li>Tap the three-dot menu, then <b>Settings → Site settings → Location</b>.</li>
        <li>Find <code>app.shyftforce.com</code> in the blocked list. Tap it and switch to <b>Allowed</b>.</li>
        <li>Go back to ShyftForce and tap Clock In again.</li>
      </Steps>

      <h3>Reason 2: You're outside the clock-in zone</h3>
      <p>Your location is being shared correctly, but you're too far from the address your manager set as the work location. We'll record the punch but flag it as &quot;away from location&quot; — your manager will see it and either approve or ask you about it.</p>

      <Callout kind="tip" title="If this happens a lot at your actual workplace">
        Your manager can adjust the clock-in zone size. The default is 100 meters (about a city block). If you work at a big warehouse, campus, or outdoor site, ask them to make the zone bigger in <b>Settings → Your locations</b>.
      </Callout>

      <h3>Reason 3: You're not assigned to a shift</h3>
      <p>The button is greyed out if you don't have a scheduled shift starting soon. You can usually still punch in early (we allow 30 minutes before your scheduled start by default), but not arbitrary days. If you think you should have a shift, check the <Link href="/schedule" className="text-brand-300 underline">Schedule</Link> page or ask your manager.</p>

      <h3>Still not working?</h3>
      <p>Take a screenshot of your screen, then email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a> with the screenshot, your phone model, and what you tapped. We'll figure it out.</p>
    </Prose>
  );
}
