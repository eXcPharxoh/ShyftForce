import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>The blue assistant button at the top of every page (or press <kbd>⌘K</kbd> on Mac, <kbd>Ctrl+K</kbd> on Windows) is more than a help bot. It can also <b>do things for you</b> — create roles, send messages, summarize the week, draft a schedule, set up a PTO category.</p>

      <h3>Things you can ask</h3>
      <p>Type in plain English. Some examples that actually work:</p>
      <ul>
        <li>&quot;Build this week's schedule for the Main Street location, two cashiers per shift Mon–Fri.&quot;</li>
        <li>&quot;How much labor cost did we run last week?&quot;</li>
        <li>&quot;Send Sarah a message asking if she can swap her Saturday shift with Marcus.&quot;</li>
        <li>&quot;Create a custom role called Shift Lead with permission to publish schedules but not edit billing.&quot;</li>
        <li>&quot;What's our compliance rate this month?&quot;</li>
        <li>&quot;Show me everyone who hasn't onboarded yet.&quot;</li>
        <li>&quot;Add a PTO category for jury duty with 24 hours per year, unpaid.&quot;</li>
      </ul>

      <h3>How it works</h3>
      <Steps>
        <li>You type your question.</li>
        <li>The assistant decides whether it needs to read data, perform an action, or both.</li>
        <li>For read-only questions (&quot;what's…&quot;), it answers from your live workspace data.</li>
        <li>For actions, it shows you what it's about to do and asks you to confirm before executing — so it never quietly does something you didn't intend.</li>
        <li>Once you confirm, it does the thing and confirms back with a link to verify.</li>
      </Steps>

      <Callout kind="tip" title="It only sees your workspace">
        The assistant only has access to your organization's data — never another customer's. It can't read your email, your bank account, or anything outside ShyftForce. Everything it does shows up in the audit log under your name.
      </Callout>

      <h3>When to use it vs the regular UI</h3>
      <ul>
        <li><b>Use the assistant</b> when you'd describe what you want faster than you'd click your way there — bulk operations, anything with conditions ("any shift longer than 8 hours next week"), one-offs you do rarely.</li>
        <li><b>Use the regular UI</b> when you're doing visual work (drag a shift, look at the map), reviewing a list, or you don't trust automation for that decision (approving a delicate time-off request).</li>
      </ul>

      <h3>What if it gets something wrong?</h3>
      <p>Every action goes through the same audit log as if you'd done it by hand. Undo is built in for most actions (delete a shift, unpublish, restore a member). For anything bigger, message <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a> with a screenshot — the team can help untangle it from the audit log.</p>
    </Prose>
  );
}
