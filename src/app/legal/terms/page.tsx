export default function TermsPage() {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Legal</div>
      <h1 className="text-4xl font-bold tracking-tight-2 mb-2">Terms of Service</h1>
      <p className="text-ink-500 dark:text-ink-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div className="mt-10 space-y-6 text-ink-700 dark:text-ink-300 leading-relaxed">
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
          <b>Draft Terms.</b> These terms are a starting draft, not legal advice. If you&rsquo;re relying on the service for a business-critical workflow, request a counsel-reviewed Order Form from <a href="mailto:legal@shyftforce.com" className="underline">legal@shyftforce.com</a> before purchase.
        </div>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">1. Acceptable use</h2>
          <p>shyftforce is provided for legitimate workforce-management purposes. You may not: use the service for illegal activity, attempt to compromise security, scrape or reverse-engineer the platform, or use it to send unsolicited communications.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">2. Subscription & billing</h2>
          <p>14-day free trial. Subscriptions auto-renew monthly unless canceled. Cancel anytime in <code className="bg-ink-100 dark:bg-ink-800 px-1 py-0.5 rounded">Settings → Billing</code>. No refunds for partial months.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">3. Data ownership</h2>
          <p>You own your data. We process it on your behalf. You can export at any time. We delete it within 30 days of account closure.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">4. Liability</h2>
          <p>Service provided "as is". To the maximum extent permitted by law, shyftforce is not liable for indirect, incidental, or consequential damages. Total liability capped at fees paid in the prior 12 months.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">5. Contact</h2>
          <p>Questions? Email <a href="mailto:legal@shyftforce.com" className="text-brand-600 dark:text-brand-400 hover:underline">legal@shyftforce.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
