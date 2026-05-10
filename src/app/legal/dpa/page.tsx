export default function DPAPage() {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Legal</div>
      <h1 className="text-4xl font-bold tracking-tight-2 mb-2">Data Processing Agreement</h1>
      <p className="text-ink-500 dark:text-ink-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div className="mt-10 space-y-6 text-ink-700 dark:text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">Placeholder DPA</h2>
          <p><b>This is a placeholder Data Processing Agreement for development.</b> Replace with a real DPA before signing B2B contracts. Many enterprise customers will require a signed DPA before they can purchase.</p>
          <p className="mt-3">Need a real DPA template? Use <a href="https://termly.io" className="text-brand-600 dark:text-brand-400 hover:underline">Termly</a> or have a privacy lawyer draft one. Vanta and Drata also bundle a DPA template with their SOC 2 packages.</p>
        </section>

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
