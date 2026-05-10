export default function PrivacyPage() {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Legal</div>
      <h1 className="text-4xl font-bold tracking-tight-2 mb-2">Privacy Policy</h1>
      <p className="text-ink-500 dark:text-ink-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div className="mt-10 space-y-6 text-ink-700 dark:text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">1. Placeholder notice</h2>
          <p>
            This is a placeholder Privacy Policy generated for development. <b>Replace before launching to real customers.</b> Use a service like
            <a href="https://termly.io" className="text-brand-600 dark:text-brand-400 hover:underline mx-1">Termly</a>
            or
            <a href="https://www.iubenda.com" className="text-brand-600 dark:text-brand-400 hover:underline mx-1">Iubenda</a>
            to generate a compliant version for your jurisdiction (GDPR / CCPA / etc.).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">2. What we collect</h2>
          <p>We collect: account details (name, email, password hash), workspace data (employees, schedules, time entries), usage analytics (feature interactions, error logs), and — when enabled — geolocation and selfie data for clock-in verification.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">3. How we use it</h2>
          <p>To operate shyftforce: schedule, clock in/out, payroll calculation, compliance auditing, customer support, billing, and product improvement. We do not sell personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">4. Your rights</h2>
          <p>Account owners can export or delete their workspace at any time from <code className="bg-ink-100 dark:bg-ink-800 px-1 py-0.5 rounded">Settings → Billing</code>. EU/UK/CA residents can request data subject access requests via <a href="mailto:privacy@shyftforce.com" className="text-brand-600 dark:text-brand-400 hover:underline">privacy@shyftforce.com</a>.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">5. Subprocessors</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Neon (PostgreSQL hosting) — US East</li>
            <li>Vercel (web hosting + edge network)</li>
            <li>Anthropic (Claude API for AI Co-pilot)</li>
            <li>Stripe (billing)</li>
            <li>Resend (transactional email)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-50 mt-8 mb-3">6. Contact</h2>
          <p>Questions? Email <a href="mailto:privacy@shyftforce.com" className="text-brand-600 dark:text-brand-400 hover:underline">privacy@shyftforce.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
