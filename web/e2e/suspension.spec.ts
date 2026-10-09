import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { signInAs } from './auth'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function createDisposableUser(prefix: string) {
  const email = `${prefix}-${Date.now()}@rentify.nl`
  const password = 'TestPassword123!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return { id: data.user.id, email, password }
}

test('a suspended user sees the suspended screen instead of the app', async ({ page }) => {
  const user = await createDisposableUser('suspend-target')
  await signInAs(page, user.email, user.password)
  await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible()

  await admin.from('profiles').update({ suspended_at: new Date().toISOString(), suspension_reason: 'E2E test suspension' }).eq('id', user.id)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your account is suspended' })).toBeVisible()
  await expect(page.getByText('E2E test suspension')).toBeVisible()

  await admin.auth.admin.deleteUser(user.id)
})

test("a suspended owner's listings disappear from other users' Browse", async ({ page }) => {
  const owner = await createDisposableUser('suspend-owner')
  const viewer = await createDisposableUser('suspend-viewer')

  const title = `E2E suspension test listing ${Date.now()}`
  const { data: listing } = await admin
    .from('listings')
    .insert({ owner_id: owner.id, title, category: 'Other', price_per_day: 1, city: 'Tilburg', photos: [] })
    .select('id')
    .single()

  await signInAs(page, viewer.email, viewer.password)
  await page.goto('/browse')
  await expect(page.getByText(title)).toBeVisible()

  await admin.from('profiles').update({ suspended_at: new Date().toISOString(), suspension_reason: 'E2E test' }).eq('id', owner.id)

  await page.reload()
  await expect(page.getByText(title)).not.toBeVisible()

  await admin.from('listings').delete().eq('id', listing!.id)
  await admin.auth.admin.deleteUser(owner.id)
  await admin.auth.admin.deleteUser(viewer.id)
})
