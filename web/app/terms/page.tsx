import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Rentify',
}

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-400">Last updated October 7, 2026</p>
        </div>

        <p className="text-gray-700">
          Rentify is operated by Tobias Benavides (&ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms
          cover your use of the Rentify website and app. By creating an account, you agree to them.
          If anything here is unclear, email{' '}
          <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
            hello@rentify.nl
          </a>{' '}
          before signing up.
        </p>

        <Section title="1. Who can use Rentify">
          <p>You must be at least 18 years old and able to enter into a binding contract to use Rentify.</p>
        </Section>

        <Section title="2. What Rentify is">
          <p>
            Rentify is a platform that connects people who want to rent out items they own
            (&ldquo;owners&rdquo;) with people who want to rent those items (&ldquo;renters&rdquo;).
            <strong className="font-semibold text-gray-900"> Rentify is not a party to any rental</strong> —
            each rental is a direct agreement between the owner and the renter. We don&apos;t own,
            inspect, or control the items listed, and we don&apos;t guarantee their condition,
            safety, legality, or that a listing is accurate.
          </p>
        </Section>

        <Section title="3. Listings">
          <p>
            If you list an item, you confirm you own it or have the right to rent it out, that your
            description and photos are accurate, and that the item is legal to own and rent in the
            Netherlands. You&apos;re responsible for setting a fair price and for the item&apos;s
            condition when handed over.
          </p>
          <p>Don&apos;t list anything illegal, dangerous, or that you don&apos;t have the right to rent out.</p>
        </Section>

        <Section title="4. Requesting and approving a rental">
          <p>
            Renters request specific dates; owners can approve or decline. Once approved, the renter
            pays before pickup. Either side can cancel before payment is made; after payment,
            cancellation is handled between the two of you — contact us at{' '}
            <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
              hello@rentify.nl
            </a>{' '}
            if you can&apos;t resolve it directly.
          </p>
        </Section>

        <Section title="5. Payments">
          <p>
            Payment happens either through Stripe, or — while an owner hasn&apos;t connected a Stripe
            payout account yet — directly between renter and owner using whatever payment
            instructions (e.g. a bank transfer or Tikkie link) the owner has provided on their
            profile. When payment happens outside Stripe, Rentify has no visibility into or
            responsibility for whether it was actually sent or received — that confirmation is
            between the two of you.
          </p>
          <p>
            Rentify currently charges no commission on rentals. This may change in the future; we&apos;ll
            update this page if it does. Late returns may incur an additional fee at the listing&apos;s
            daily rate.
          </p>
        </Section>

        <Section title="6. Reviews and conduct">
          <p>
            After a rental, both sides can leave a review. Reviews must be honest and about your
            actual experience. You can report a listing or block another user at any time; we may
            use reports to review or remove accounts that violate these terms.
          </p>
        </Section>

        <Section title="7. Disclaimers and limitation of liability">
          <p>
            Rentify is provided &ldquo;as is&rdquo;, without warranties of any kind. We do our best to
            keep the platform working correctly but don&apos;t guarantee it will be uninterrupted,
            secure, or error-free.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">
              To the fullest extent permitted by law, Rentify and Tobias Benavides are not liable for
              any loss, damage, theft, injury, or dispute arising from a rental, an item, or
              interactions between users.
            </strong>{' '}
            This includes damaged or lost items, late returns, missed handoffs, or disagreements about
            an item&apos;s condition. Those risks sit with the owner and renter directly, not with us.
            Where liability can&apos;t be fully excluded under Dutch law, it&apos;s limited to the amount
            you paid Rentify in the 3 months before the claim (which, given there&apos;s currently no
            commission, is typically nothing).
          </p>
          <p>
            You agree to use Rentify at your own risk and to resolve disputes about a specific rental
            directly with the other party first.
          </p>
        </Section>

        <Section title="8. Ending your account">
          <p>
            You can stop using Rentify at any time. We can suspend or remove accounts that violate
            these terms, misuse the platform, or put other users at risk.
          </p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these terms as Rentify grows. We&apos;ll update the date at the top of this
            page when we do. Continuing to use Rentify after a change means you accept the update.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>These terms are governed by the laws of the Netherlands.</p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about these terms:{' '}
            <a href="mailto:hello@rentify.nl" className="text-emerald-700 underline underline-offset-4">
              hello@rentify.nl
            </a>
          </p>
        </Section>

        <p className="border-t border-gray-100 pt-6 text-sm text-gray-400">
          See also our{' '}
          <Link href="/privacy" className="text-emerald-700 underline underline-offset-4">
            Privacy Policy
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
