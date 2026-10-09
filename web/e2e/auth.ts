import type { Page } from '@playwright/test'

// Dedicated test account, used only against localhost -- see
// "Testing the user's own application" in the project's operating rules.
// Never reused against the live site.
export async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local')
  }

  await page.goto('/sign-in')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('/browse')
}

// For disposable accounts (created via the admin API in a spec's own
// setup) rather than the shared TEST_USER account above -- a brand-new
// account always hits TermsGateModal on its first protected-page load
// (no terms_acceptances rows yet), so this clears it before proceeding.
export async function signInAs(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  const modal = page.getByTestId('terms-gate-modal')
  const gated = await modal.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)
  if (gated) {
    await modal.getByRole('button', { name: 'I agree' }).click()
    await modal.waitFor({ state: 'hidden' })
  } else {
    await page.waitForURL('/browse')
  }
}
