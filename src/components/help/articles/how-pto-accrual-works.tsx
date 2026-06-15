import Link from "next/link";
import { Prose, Callout } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>PTO (paid time off) is the bank of hours each employee can use for vacation, sick days, or whatever categories you define. ShyftForce tracks the balance for you so you don't need a spreadsheet.</p>

      <h3>What we ship out of the box</h3>
      <p>Every workspace starts with one PTO category called <b>Vacation</b>, set to 80 hours per year (two weeks at 40h/week). Healthcare and office industries also get <b>Sick</b> and <b>Bereavement</b>. You can rename, add, or remove categories any time in <Link href="/settings/pto" className="text-brand-300 underline">Settings → Time-off policies</Link>.</p>

      <h3>How accrual works</h3>
      <p>Right now, accrual works one way: <b>annual lump sum</b>. On January 1, every employee gets their full annual hours credited. For new hires, we pro-rate by months remaining in the year — somebody hired in September gets 4/12 of the annual amount.</p>

      <Callout kind="tip" title="Why no per-pay-period accrual?">
        That's coming. For now, if you need stricter accrual (per pay period, per hour worked), set the annual hours to 0 — we'll stop tracking the balance and just record requests for visibility, so you can manage the actual accrual in your payroll system.
      </Callout>

      <h3>Unlimited PTO</h3>
      <p>Set annual hours to <code>0</code> on any category and we treat it as unlimited — we record the request, you approve it, no balance is debited.</p>

      <h3>What happens at year-end</h3>
      <p>By default, unused PTO doesn't roll over. On January 1 the balance resets to the annual amount. If your policy is different (rollover, payout, max-cap), turn off automatic accrual and manage it in payroll — we'll record requests but not touch balances.</p>

      <h3>How an employee uses it</h3>
      <p>They go to <Link href="/time-off" className="text-brand-300 underline">Time off</Link>, pick a category and dates, and submit. You see the request in your dashboard's "Today's priorities" or under <Link href="/time-off" className="text-brand-300 underline">Time off → Pending</Link>. When you approve, the hours are subtracted from their balance immediately and any shifts that overlap are flagged.</p>
    </Prose>
  );
}
