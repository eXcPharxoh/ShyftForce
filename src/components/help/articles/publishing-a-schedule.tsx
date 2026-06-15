import Link from "next/link";
import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>A shift can be in one of two states: <b>draft</b> or <b>published</b>. Drafts are only visible to managers — your team doesn't see them and won't get notifications. Published shifts go out to everyone.</p>

      <h3>How to publish</h3>
      <Steps>
        <li>On the <Link href="/schedule" className="text-brand-300 underline">Schedule</Link> page, build out your week. Every shift you add starts as a draft (shown with a dashed amber outline).</li>
        <li>When you're happy, click <b>Publish week</b> in the top-right. We'll show you exactly what's about to be sent so there are no surprises.</li>
        <li>Confirm. Everyone with a shift in the published range gets a notification — push, email, or SMS depending on what they have turned on.</li>
      </Steps>

      <h3>What if I publish a mistake?</h3>
      <p>You can edit or delete a published shift the same way as a draft — open the shift, change it, save. If the change affects someone, they'll get a &quot;schedule change&quot; notification telling them what shifted.</p>
      <p>If you published the WHOLE week by accident and want to roll back: open each shift and either delete it or change its state back to draft. We don't have a one-click &quot;unpublish week&quot; on purpose — too easy to delete real work by accident.</p>

      <Callout kind="tip" title="Run a compliance check first">
        Before publishing, the <Link href="/compliance" className="text-brand-300 underline">Compliance</Link> page will scan your draft for overtime, missing breaks, and Fair Workweek issues. Cheaper to catch them now than after payroll.
      </Callout>

      <h3>Predictive scheduling laws</h3>
      <p>If you're in a city with Fair Workweek (NYC, Seattle, Oregon, Chicago, Philadelphia, etc.) and you publish a shift with less than 14 days' notice, you may owe predictability pay. We flag this on the compliance page and on the shift itself — but the obligation to pay is yours, not ours.</p>
    </Prose>
  );
}
