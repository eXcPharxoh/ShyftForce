export default function TermsPage() {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Legal</div>
      <h1 className="text-4xl font-bold tracking-tight-2 mb-2">Terms of Service</h1>
      <p className="text-ink-500 dark:text-ink-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div className="mt-10 space-y-6 text-ink-700 dark:text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">1. Placeholder notice</h2>
          <p><b>This is a placeholder Terms of Service generated for development. Replace before launching to real customers.</b> Generate a compliant version with Termly, Iubenda, or your lawyer.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">2. Acceptable use</h2>
          <p>shyftforce is provided for legitimate workforce-management purposes. You may not: use the service for illegal activity, attempt to compromise security, scrape or reverse-engineer the platform, or use it to send unsolicited communications.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">3. Subscription & billing</h2>
          <p>14-day free trial. Subscriptions auto-renew monthly unless canceled. Cancel anytime in <code className="bg-ink-100 dark:bg-ink-800 px-1 py-0.5 rounded">Settings → Billing</code>. No refunds for partial months.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">4. Data ownership</h2>
          <p>You own your data. We process it on your behalf. You can export at any time. We delete it within 30 days of account closure.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">5. Liability</h2>
          <p>Service provided "as is". To the maximum extent permitted by law, shyftforce is not liable for indirect, incidental, or consequential damages. Total liability capped at fees paid in the prior 12 months.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">6. Contact</h2>
          <p>Questions? Email <a href="mailto:legal@shyftforce.com" className="text-brand-600 dark:text-brand-400 hover:underline">legal@shyftforce.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
