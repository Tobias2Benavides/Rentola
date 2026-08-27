import Stripe from 'stripe'

let cachedClient: Stripe | null = null

// Lazily constructed so importing this module (e.g. during `next build`'s
// route analysis) never requires STRIPE_SECRET_KEY to be set — only
// actually calling a Stripe API does.
export function getStripe(): Stripe {
  if (!cachedClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    cachedClient = new Stripe(key)
  }
  return cachedClient
}

// Platform fee taken out of every rental payment, in basis points (1000 = 10%).
export const PLATFORM_FEE_BPS = 1000

export function platformFeeFor(totalPriceCents: number): number {
  return Math.round((totalPriceCents * PLATFORM_FEE_BPS) / 10000)
}
