import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Rentify',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-emerald-700">
            Rentify
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            ← Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 py-16">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-400">Last updated October 7, 2026</p>
        </div>

        <p className="text-gray-700">
          Rentify is operated by Tobias Benavides, who is responsible for the data described below.
          Questions or requests about your data can go to{' '}
          <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
            hello@rentify.nl
          </a>
          .
        </p>

        <Section title="1. What we collect">
          <p>Only what&apos;s needed to run a rental marketplace:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account info: your email and password (we never see your password itself — it&apos;s handled by our authentication provider).</li>
            <li>Profile info you add: display name, bio, photo, city, and (if you add it) payment instructions such as an IBAN or Tikkie link.</li>
            <li>Listings you create: title, description, category, price, city, and photos.</li>
            <li>Rental activity: requests, dates, amounts, payment status, and messages exchanged with the other party.</li>
            <li>Reviews you leave or receive, and any reports or blocks you file.</li>
          </ul>
        </Section>

        <Section title="2. Why we collect it">
          <p>
            To create your account, show your listings to other users, process a rental and its
            payment, let you message the other party, and build trust through reviews. We also use
            report and block data to keep the platform safe.
          </p>
        </Section>

        <Section title="3. Who we share it with">
          <p>We don&apos;t sell your data. It&apos;s shared only with the services that make Rentify work:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="font-medium text-gray-900">Supabase</strong> (EU-hosted) — our database, authentication, and file storage.</li>
            <li><strong className="font-medium text-gray-900">Stripe</strong> — payment processing, when a rental is paid through Stripe.</li>
            <li><strong className="font-medium text-gray-900">Resend</strong> (EU-hosted) — sends you email notifications about your rentals.</li>
            <li><strong className="font-medium text-gray-900">Vercel</strong> — hosts the website itself.</li>
          </ul>
          <p>
            Other Rentify users see what you&apos;d expect: your display name, photo, bio, listings,
            and reviews. They never see your email, password, or payment instructions unless you
            choose to share those directly with them (e.g. a Tikkie link, shown only once a rental
            is approved).
          </p>
        </Section>

        <Section title="4. How long we keep it">
          <p>
            We keep your data while your account is active. If you&apos;d like your account and data
            deleted, email{' '}
            <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
              hello@rentify.nl
            </a>{' '}
            and we&apos;ll remove it, aside from records we&apos;re legally required to keep (for
            example, payment records for tax purposes).
          </p>
        </Section>

        <Section title="5. Your rights">
          <p>
            Under GDPR, you can ask to access, correct, or delete your data, or object to how it&apos;s
            used. Most of this you can already do yourself from your Profile page; for anything else,
            email{' '}
            <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
              hello@rentify.nl
            </a>
            .
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We use one essential cookie to keep you signed in. We don&apos;t use advertising or
            tracking cookies.
          </p>
        </Section>

        <Section title="7. Children">
          <p>Rentify isn&apos;t intended for anyone under 18.</p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We&apos;ll update the date at the top of this page if this policy changes, and let you
            know if the change is significant.
          </p>
        </Section>

        <p className="border-t border-gray-100 pt-6 text-sm text-gray-400">
          See also our{' '}
          <Link href="/terms" className="text-emerald-700 underline underline-offset-4">
            Terms of Service
          </Link>
          .
        </p>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2 text-gray-700">{children}</div>
    </div>
  )
}
