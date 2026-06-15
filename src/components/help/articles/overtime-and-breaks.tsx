import Link from "next/link";
import { Prose, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Two rules trip up almost every business: how overtime is calculated, and when you have to give your team a break. Here's the short version.</p>

      <h3>Overtime — the federal default</h3>
      <p>Under the federal Fair Labor Standards Act (FLSA), non-exempt employees are owed <b>1.5× their regular rate for any hours over 40 in a single workweek</b>. The workweek is a fixed 7-day period — for most businesses, Sunday to Saturday.</p>
      <p>Some states have stricter rules:</p>
      <ul>
        <li><b>California</b> — 1.5× over 8 hours in a day, 2× over 12 hours in a day, plus the 40h/week rule.</li>
        <li><b>Alaska, Nevada</b> — 1.5× over 8 hours in a day for some employees.</li>
        <li><b>Colorado</b> — 1.5× over 12 hours in a day or 12 consecutive hours.</li>
      </ul>

      <p>ShyftForce uses your state's rule automatically based on your locations' addresses. The <Link href="/compliance" className="text-brand-300 underline">Compliance</Link> page flags any week that's heading into overtime BEFORE you publish, so you can rebalance instead of writing a bigger paycheck.</p>

      <h3>Breaks — varies a lot by state</h3>
      <p>There's no federal break requirement. Each state sets its own, and it's almost always tied to shift length:</p>
      <ul>
        <li><b>California</b> — 30-min unpaid meal break after 5 hours; 10-min paid rest break per 4 hours.</li>
        <li><b>Washington, Oregon, Colorado, Illinois</b> — 30-min meal break after 5 hours.</li>
        <li><b>New York</b> — 30-min meal break for shifts longer than 6 hours that span 11am or noon.</li>
        <li><b>Texas, Florida, Arizona</b> and many others — no state break requirement (federal default applies).</li>
      </ul>

      <p>The compliance engine flags any scheduled shift longer than the state's threshold without a planned break. Employees can punch a break from the clock-in screen; we record paid vs unpaid based on the state rule.</p>

      <Callout kind="tip" title="The most common mistake">
        Letting an employee work straight through their meal break and not paying them for it. If they don't actually get the break, you owe them for that time. Either enforce the break (the app sends a push reminder), pay them for the missed break (add as overtime line), or document a signed waiver if your state allows them.
      </Callout>

      <h3>Minors</h3>
      <p>If you employ workers under 18, hour limits and break rules are stricter under federal child labor law. Most states layer additional rules on top. We don't enforce these automatically yet — flag minor employees in their profile (Hire date + Date of birth) and we'll add a warning chip; for compliance you should also review your state's specific rules.</p>
    </Prose>
  );
}
