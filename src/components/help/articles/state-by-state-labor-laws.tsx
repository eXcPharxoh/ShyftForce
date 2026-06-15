import Link from "next/link";
import { Prose, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>Federal labor law sets the floor; states stack stricter rules on top. This reference covers the federal default plus every US state that has meaningfully different rules around overtime, meal breaks, rest breaks, and predictive scheduling.</p>

      <Callout kind="warn" title="This is a reference, not legal advice">
        Labor law changes constantly. We update this article a few times a year, but for a specific compliance question — especially around new ordinances or industry-specific rules — talk to an employment attorney in your state.
      </Callout>

      <h2>Federal default (FLSA)</h2>
      <ul>
        <li><b>Overtime:</b> 1.5× regular rate for hours over 40 in a single workweek (the 7-day period is fixed by you).</li>
        <li><b>Minimum wage:</b> $7.25/hour federal; many states higher.</li>
        <li><b>Meal breaks:</b> Not required. If given (and shorter than 30 min), must be paid.</li>
        <li><b>Rest breaks:</b> Not required.</li>
        <li><b>Recordkeeping:</b> Hours worked, wages paid — retain 3 years.</li>
      </ul>

      <h2>States with stricter overtime</h2>

      <h3>California</h3>
      <ul>
        <li>Daily OT: 1.5× over 8 hours, 2× over 12 hours.</li>
        <li>Seventh-day OT: 1.5× for first 8 hours on the 7th consecutive workday, 2× after that.</li>
        <li>Plus the federal 40h/week rule.</li>
      </ul>

      <h3>Alaska, Nevada</h3>
      <ul>
        <li>Daily OT: 1.5× over 8 hours per day for non-exempt employees in certain industries.</li>
      </ul>

      <h3>Colorado</h3>
      <ul>
        <li>Daily OT: 1.5× over 12 hours in a day OR 12 consecutive hours.</li>
        <li>40h/week rule applies.</li>
      </ul>

      <h2>Meal break requirements</h2>

      <h3>California</h3>
      <ul>
        <li>30-minute unpaid meal break required after 5 hours.</li>
        <li>Second 30-minute meal break required after 10 hours.</li>
        <li>Missed-break premium: 1 hour of pay per day where the break wasn't taken.</li>
      </ul>

      <h3>Washington, Oregon, Colorado, Illinois</h3>
      <ul>
        <li>30-minute meal break after 5 hours worked.</li>
      </ul>

      <h3>New York</h3>
      <ul>
        <li>30-minute meal break for shifts longer than 6 hours that span 11am–2pm.</li>
        <li>Factory workers: 60 minutes between 11am–2pm.</li>
        <li>Shifts starting before 11am and ending after 7pm: additional 20-minute break between 5pm–7pm.</li>
      </ul>

      <h3>Massachusetts, Connecticut, Maine, Maryland, Nebraska, Tennessee, West Virginia, Vermont</h3>
      <ul>
        <li>30-minute meal break after 6 hours.</li>
      </ul>

      <h3>States with no state meal-break requirement</h3>
      <p>Texas, Florida, Arizona, Pennsylvania, Ohio, Georgia, Michigan, Indiana, Iowa, Idaho, Wyoming, and most southern states — federal default applies (i.e. no requirement).</p>

      <h2>Rest break requirements</h2>

      <h3>California, Washington, Oregon, Nevada, Colorado, Vermont</h3>
      <ul>
        <li>10-minute paid rest break for every 4 hours worked (or major fraction thereof).</li>
      </ul>

      <h3>Kentucky, Minnesota</h3>
      <ul>
        <li>Reasonable time for an employee to use the restroom — no fixed minimum.</li>
      </ul>

      <h3>All other states</h3>
      <ul>
        <li>No state rest break requirement.</li>
      </ul>

      <h2>Predictive scheduling (Fair Workweek) laws</h2>

      <p>These laws require advance notice of schedules and predictability pay for last-minute changes. See <Link href="/help/fair-workweek-explained" className="text-brand-300 underline">Fair Workweek and predictability pay</Link> for details on what triggers payment.</p>

      <h3>Active jurisdictions (2026)</h3>
      <ul>
        <li><b>New York City</b> — retail and fast-food chains</li>
        <li><b>Seattle, WA</b> — retail and food service, 500+ employees globally</li>
        <li><b>Oregon (statewide)</b> — retail/hospitality/food service, 500+ employees</li>
        <li><b>Chicago, IL</b> — most industries, 100+ employees, building services, healthcare, hotels, manufacturing, restaurants, retail, warehouse</li>
        <li><b>Philadelphia, PA</b> — retail, hospitality, food service, 250+ employees</li>
        <li><b>Los Angeles, CA</b> — retail, 300+ employees</li>
        <li><b>Berkeley, Emeryville, San Francisco (CA)</b> — local formula retail and food</li>
        <li><b>Evanston, IL</b> — local version</li>
      </ul>

      <h3>Pending / proposed</h3>
      <p>Washington state (statewide), Massachusetts, and Connecticut all have predictive scheduling bills under consideration. We'll update this list when laws pass — and the compliance engine auto-picks up new presets without you having to do anything.</p>

      <h2>Tip credit (tipped minimum wage)</h2>

      <h3>States that allow tip credit (employee paid less than minimum wage, tips making up the difference)</h3>
      <p>Most US states allow this. Federal sub-minimum: $2.13/hour as long as tips bring total to $7.25/hour.</p>

      <h3>States that prohibit tip credit (full minimum wage regardless of tips)</h3>
      <ul>
        <li>Alaska</li>
        <li>California</li>
        <li>Minnesota</li>
        <li>Montana</li>
        <li>Nevada</li>
        <li>Oregon</li>
        <li>Washington</li>
      </ul>

      <h3>States with stricter notice requirements for tip credit</h3>
      <p>NY, NJ, RI, and several others require specific written notice to the employee about the tip credit structure. The notice has to be on file. If you're in a tip-credit state with notice requirements, generate one from <Link href="/tips" className="text-brand-300 underline">Tip Pooling → Settings → Tip credit notice</Link>.</p>

      <h2>Minimum wage</h2>
      <p>This changes yearly. As of 2026, headline state minimums (full minimum, not tipped):</p>
      <ul>
        <li><b>$16+:</b> California ($16.50), Washington ($16.66), Connecticut ($16.35), New York ($16.50 — varies by region within NY), New Jersey ($15.49), Massachusetts ($15.00 — but local cities higher)</li>
        <li><b>$13–$15:</b> Oregon ($14.70 / $13.70 by region), Maryland ($15.00), Colorado ($14.81), Arizona ($14.70), Maine ($14.65), Illinois ($14.00), Vermont ($13.67), Florida ($14.00, scheduled increases), Rhode Island ($15.00)</li>
        <li><b>Federal default ($7.25):</b> Most southern states (TX, AL, MS, LA, GA, SC, TN, NC, VA), plus a few midwestern (IN, IA, OK, ND, NH)</li>
      </ul>

      <p>Many cities have higher local minimums (Seattle $20.76, San Francisco $19.18, NYC $16.50, DC $17.50). The compliance engine uses location addresses to pick up the right one.</p>

      <h2>Recordkeeping</h2>

      <p>Federal FLSA requires retaining payroll and timekeeping records for <b>3 years</b>. Some states require longer:</p>
      <ul>
        <li><b>California, Washington, Oregon</b> — 3 years (matches federal but with stricter content requirements).</li>
        <li><b>New York</b> — 6 years for wage records.</li>
        <li><b>OSHA (workplace injury)</b> — 5 years.</li>
      </ul>

      <p>We retain everything you do in ShyftForce indefinitely while your account is active. If you cancel, the wage-records retention plan keeps the legally-required records for the relevant period.</p>

      <Callout kind="tip" title="One more thing">
        Federal rules are floors, not ceilings. When state and federal rules conflict, you follow the one that's MORE generous to the employee. If California requires 1.5× over 8 hours/day but federal only requires it over 40 hours/week, you pay California's rule.
      </Callout>
    </Prose>
  );
}
