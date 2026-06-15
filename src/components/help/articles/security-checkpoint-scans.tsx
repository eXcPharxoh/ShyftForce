import Link from "next/link";
import { Prose, Steps, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Patrol checkpoints are physical QR codes you post around a site (lobby corner, side door, parking lot, server room). Your security staff scans them with the ShyftForce app as they patrol — giving you a verifiable, time-stamped record of where they actually went and when.</p>

      <h3>Setting up checkpoints</h3>
      <Steps>
        <li>Go to <Link href="/settings/checkpoints" className="text-brand-300 underline">Settings → Patrol Checkpoints</Link>.</li>
        <li>Click <b>New checkpoint</b>. Give it a name (&quot;Lobby NE corner&quot;), pick the location and post number.</li>
        <li>Click <b>Print QR</b>. We render a printable sheet with the QR code, a unique short code (for backup if the QR is damaged), and a label area you can write on.</li>
        <li>Laminate it (or stick it in a clear pouch — patrol sites are humid). Mount it.</li>
        <li>Repeat for every checkpoint on the route. Most patrol routes have 6–15 points.</li>
      </Steps>

      <h3>How patrol staff scan</h3>
      <p>In the ShyftForce app, your guards see a <b>Scan</b> button on their attendance screen during a shift. They tap it, their phone camera opens, they aim at the QR code, scan. The app records: who scanned, which checkpoint, GPS coordinates, timestamp.</p>
      <p>If a checkpoint is damaged or the QR won't scan, they can type the short code instead. Same result.</p>

      <h3>What you see as a supervisor</h3>
      <p>The <Link href="/checkpoints" className="text-brand-300 underline">Patrol Checkpoints</Link> dashboard shows a live feed of every scan in the last 24 hours, plus per-shift compliance: did the guard hit every checkpoint on their route?</p>

      <Callout kind="tip" title="Out-of-zone flags">
        If a guard scans a QR code while their phone's GPS shows they're NOT near the actual checkpoint location, we flag it. This catches the trick of taking photos of every QR code and scanning them from one location — happens in security and you should know about it.
      </Callout>

      <h3>Required vs optional patrol routes</h3>
      <p>You can mark certain checkpoints as &quot;must hit during every patrol shift&quot; — if a guard ends a shift without scanning a required checkpoint, the shift gets a compliance warning on the supervisor's dashboard. Useful for insurance / client reporting purposes.</p>

      <h3>Sharing with clients</h3>
      <p>If you bill clients per-account, you can give them a read-only view of the patrol records for THEIR site only — proves you did what they're paying for. Generate a share link from <Link href="/clients" className="text-brand-300 underline">Client Accounts</Link>.</p>
    </Prose>
  );
}
