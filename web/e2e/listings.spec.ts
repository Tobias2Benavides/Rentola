import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { signIn } from './auth'

// Cleans up after itself using the service role key, so re-running this
// suite doesn't leave junk listings on the real Browse page each time.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

test('creating a listing publishes it and shows up on its detail page', async ({ page }) => {
  await signIn(page)
  await page.goto('/listings/new')

  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'fixtures/test-item.jpg'))
  await page.getByPlaceholder('e.g. Electric pressure washer').fill('Playwright test item')
  await page.getByPlaceholder("Condition, what's included, pickup instructions…").fill('Created by an automated test -- safe to ignore or delete.')
  await page.getByPlaceholder('15.00').fill('1')
  await page.getByPlaceholder('Start typing a city…').fill('Tilburg')

  await page.getByRole('button', { name: 'Publish Listing' }).click()

  await page.waitForURL(/\/browse\/.+/)
  await expect(page.getByRole('heading', { name: 'Playwright test item' })).toBeVisible()

  const listingId = page.url().split('/browse/')[1]
  await admin.from('listings').delete().eq('id', listingId)
})
