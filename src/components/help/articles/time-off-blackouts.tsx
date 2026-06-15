import Link from "next/link";
import { Prose, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>A blackout period is a date range where you don't want to approve time off. Black Friday, the week of Christmas, your county fair, tax week, hurricane season — every business has them.</p>

      <h3>How they work</h3>
      <p>Blackouts don't block requests — employees can still submit time off during the period. But you get a clear warning on the approval screen, and the dates are highlighted on the schedule so you don't forget.</p>

      <h3>Setting one up</h3>
      <ol>
        <li>Go to <Link href="/settings/time-off-blackouts" className="text-brand-300 underline">Settings → Time-off blackouts</Link>.</li>
        <li>Click <b>New blackout</b>.</li>
        <li>Name it (e.g. &quot;Black Friday week&quot;), pick start and end dates, optionally limit to certain locations or positions.</li>
        <li>Save.</li>
      </ol>

      <h3>Out-of-the-box blackouts</h3>
      <p>When you pick your industry during signup, we pre-fill a few common ones for you. Examples:</p>
      <ul>
        <li><b>Retail / grocery</b>: Black Friday, the two weeks before Christmas</li>
        <li><b>Restaurant</b>: Valentine's Day, Mother's Day, New Year's Eve</li>
        <li><b>Fitness</b>: First two weeks of January (resolution rush)</li>
        <li><b>Education</b>: state testing weeks, graduation</li>
        <li><b>Healthcare</b>: peak flu season (Oct–Feb)</li>
      </ul>

      <p>You can edit or delete any of these any time — they're just smart defaults to save you from a blank slate.</p>

      <Callout kind="warn" title="Blackouts aren't a hard block by design">
        Sometimes you do approve time off during a blackout (employee gets a family emergency, you're overstaffed that week anyway). Hard-blocking would mean you'd have to delete blackouts every time you make an exception. The warning is enough — you stay in control.
      </Callout>
    </Prose>
  );
}
