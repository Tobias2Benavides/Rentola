import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'

// Disposable accounts, not the shared Playwright test account -- these
// tests mutate terms-acceptance/admin/suspension state, which would
// race with other spec files running in parallel against one shared
// user (playwright.config.ts runs fullyParallel).
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function createDisposableUser(prefix: string) {
  const email = `${prefix}-${Date.now()}@rentify.nl`
  const password = 'TestPassword123!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return { id: data.user.id, email, password }
}

test('a brand-new user sees the terms modal and must agree before using the app', async ({ page }) => {
  const user = await createDisposableUser('terms-gate')

  await page.goto('/sign-in')
  await page.getByPlaceholder('you@example.com').fill(user.email)
  await page.getByPlaceholder('Your password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  const modal = page.getByTestId('terms-gate-modal')
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('link', { name: 'Terms of Service' })).toBeVisible()
  await expect(modal.getByRole('link', { name: 'Rental Agreement' })).toBeVisible()
  await expect(modal.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()

  await modal.getByRole('button', { name: 'I agree' }).click()
  await expect(modal).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible()

  const { data: acceptances } = await admin.from('terms_acceptances').select('document').eq('user_id', user.id)
  expect(acceptances?.map((a) => a.document).sort()).toEqual(['privacy', 'rental_agreement', 'terms'])

  await admin.auth.admin.deleteUser(user.id)
})

test('signup is blocked until the terms checkbox is checked', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByPlaceholder('you@example.com').fill(`signup-check-${Date.now()}@rentify.nl`)
  await page.getByPlaceholder('At least 8 characters').fill('TestPassword123!')
  await page.getByPlaceholder('Re-enter your password').fill('TestPassword123!')

  await expect(page.getByRole('button', { name: 'Create Account' })).toBeDisabled()
  await page.getByLabel(/I am 18 or older/).check()
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled()
})
