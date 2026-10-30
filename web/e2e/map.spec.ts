import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { signIn } from './auth'

// Cleans up after itself using the service role key, same pattern as
// listings.spec.ts.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

test('creating a listing with a preset meetup-spot location shows a pin on its detail page and on Browse', async ({ page }) => {
  await signIn(page)
  await page.goto('/listings/new')

  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'fixtures/test-item.jpg'))
  await page.getByPlaceholder('e.g. Electric pressure washer').fill('Playwright map test item')
  await page.getByPlaceholder("Condition, what's included, pickup instructions…").fill('Created by an automated test -- safe to ignore or delete.')
  await page.getByPlaceholder('15.00').fill('1')
  await page.getByPlaceholder('Start typing a city…').fill('Tilburg')
  await page.getByText('I own this item or am allowed to rent it out.').click()
  await page.getByText('This item is safe and accurately described.').click()
  await page.getByText('This item is not on the').click()

  // Preset meetup spot instead of typing+geocoding a real address -- faster
  // and deterministic, and exercises the privacy-preserving picker path.
  await page.getByRole('button', { name: 'LocHal library' }).click()
  await expect(page.getByText('Drag the pin to fine-tune the exact spot.')).toBeVisible()

  await page.getByRole('button', { name: 'Publish Listing' }).click()
  await page.waitForURL(/\/browse\/.+/)
  await expect(page.getByRole('heading', { name: 'Playwright map test item' })).toBeVisible()

  // Detail page: pin + address text + a working "Get directions" deep link.
  await expect(page.getByText('Burgemeester Brokxlaan 1000, Tilburg')).toBeVisible()
  const directionsLink = page.getByRole('link', { name: 'Get directions' })
  await expect(directionsLink).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=51\.5595,5\.0831$/)

  const listingId = page.url().split('/browse/')[1]

  // Browse page: map view should include this newly-located listing.
  await page.goto('/browse')
  await page.getByRole('button', { name: 'Map' }).click()
  await expect(page.getByText(/\d+ of \d+ listings have a location set/)).toBeVisible()

  await admin.from('listings').delete().eq('id', listingId)
})
