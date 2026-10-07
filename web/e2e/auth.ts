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
