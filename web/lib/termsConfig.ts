// Pure constants shared by client and server code -- kept separate from
// lib/legal.ts because that module imports `fs` to load markdown content,
// which can't be bundled into client components.

// Bumped whenever terms.md, rental-agreement.md, or privacy.md changes in a
// way that needs re-acceptance. See TermsGateModal / lib/termsAcceptance.ts.
export const CURRENT_TERMS_VERSION = 1

export type TermsDocument = 'terms' | 'rental_agreement' | 'privacy'

export const TERMS_DOCUMENTS: { document: TermsDocument; slug: string; label: string }[] = [
  { document: 'terms', slug: '/terms', label: 'Terms of Service' },
  { document: 'rental_agreement', slug: '/rental-agreement', label: 'Rental Agreement' },
  { document: 'privacy', slug: '/privacy', label: 'Privacy Policy' },
]
