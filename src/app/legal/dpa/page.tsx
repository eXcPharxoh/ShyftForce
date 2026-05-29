export default function DPAPage() {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Legal</div>
      <h1 className="text-4xl font-bold tracking-tight-2 mb-2">Data Processing Agreement</h1>
      <p className="text-ink-500 dark:text-ink-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div className="mt-10 space-y-6 text-ink-700 dark:text-ink-300 leading-relaxed">
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
          <b>Draft DPA.</b> This document outlines our intended posture for processing personal data on behalf of customers. For an executable, counsel-reviewed DPA suitable for B2B signing, email <a href="mailto:legal@shyftforce.com" className="underline">legal@shyftforce.com</a> with your entity details.
        </div>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">Standard contractual clauses</h2>
          <p>For EU/UK transfers, shyftforce relies on the EU Standard Contractual Clauses (Decision 2021/914) and the UK International Data Transfer Addendum.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">Sub-processors</h2>
          <p>See the <a href="/legal/privacy" className="text-brand-600 dark:text-brand-400 hover:underline">Privacy Policy</a> for the current list. We will provide 30 days' advance notice of new sub-processors via email.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">Contact</h2>
          <p>Need a signed copy? Email <a href="mailto:legal@shyftforce.com" className="text-brand-600 dark:text-brand-400 hover:underline">legal@shyftforce.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
