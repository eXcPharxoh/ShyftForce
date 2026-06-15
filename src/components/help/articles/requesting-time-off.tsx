import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Need a day off? Submit it through the app and your manager gets a notification immediately. Most decisions come back within a day.</p>

      <Steps>
        <li>Open the app on your phone or computer and tap <Link href="/time-off" className="text-brand-300 underline">Time off</Link>.</li>
        <li>Tap <b>Request time off</b> in the top-right.</li>
        <li>Pick a category (vacation, sick, personal — depends on what your employer set up).</li>
        <li>Pick start and end dates. For a single day, set them to the same date.</li>
        <li>Optionally add a note for your manager ("Doctor appointment", "Family wedding"). Some employers require this for certain categories.</li>
        <li>Tap <b>Submit request</b>. You'll see it in your Time off page with status <b>Pending</b>.</li>
      </Steps>

      <h3>What happens after you submit</h3>
      <ul>
        <li>Your manager gets a notification right away.</li>
        <li>If they approve, you'll get a push, email, and/or SMS confirming. The hours come out of your balance.</li>
        <li>If you have any shifts scheduled during that time, your manager can either remove you (the shift becomes &quot;open&quot; for someone else to claim) or keep you on it and remind you.</li>
        <li>If they decline, you'll get a notification with their reason if they added one.</li>
      </ul>

      <Callout kind="tip" title="How much time do I have?">
        Your current PTO balance is shown at the top of the Time off page. Categories with &quot;Unlimited&quot; have no balance — you just request, your manager approves.
      </Callout>

      <h3>Cancelling a request</h3>
      <p>If you haven't been approved yet and your plans changed, tap the request in your Time off list and choose <b>Cancel request</b>. If you've already been approved, your manager has to cancel it for you — send them a message.</p>

      <h3>Last-minute call-outs</h3>
      <p>If you're calling out same-day, time-off requests aren't the right tool. Message your manager directly through the app, then they can mark your scheduled shift as open and start the marketplace process to find coverage.</p>
    </Prose>
  );
}
