import { test, expect } from '@playwright/test'
import { signIn } from './auth'

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

test('browse shows active listings', async ({ page }) => {
  await page.goto('/browse')
  await expect(page.getByText('Valenti Spirit city bike')).toBeVisible()
  await expect(page.getByText('LaPaz classical guitar')).toBeVisible()
})

test('category dropdown filters results to just that category', async ({ page }) => {
  await page.goto('/browse')

  await page.getByTestId('category-trigger').click()
  await page.getByRole('button', { name: 'Musical Instruments' }).click()
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(/category=Musical(\+|%20)Instruments/)
  await expect(page.getByText('LaPaz classical guitar')).toBeVisible()
  await expect(page.getByText('Valenti Spirit city bike')).not.toBeVisible()
})

test('category dropdown resets back to all categories', async ({ page }) => {
  await page.goto('/browse?category=Musical+Instruments')
  await expect(page.getByText('Valenti Spirit city bike')).not.toBeVisible()

  await page.getByTestId('category-trigger').click()
  await page.getByRole('button', { name: 'All categories' }).click()
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page.getByText('Valenti Spirit city bike')).toBeVisible()
  await expect(page.getByText('LaPaz classical guitar')).toBeVisible()
})
