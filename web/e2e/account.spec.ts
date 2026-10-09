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

test('exporting my data returns the expected shape', async ({ page }) => {
  const user = await createDisposableUser('export-test')
  await signInAs(page, user.email, user.password)

  const response = await page.request.get('/api/account/export')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-disposition']).toContain('attachment')

  const body = await response.json()
  expect(body.account.email).toBe(user.email)
  expect(body).toHaveProperty('profile')
  expect(body).toHaveProperty('listings')
  expect(body).toHaveProperty('rentals_as_owner')
  expect(body).toHaveProperty('rentals_as_renter')
  expect(body).toHaveProperty('reports_filed')
  expect(body).toHaveProperty('terms_acceptances')

  await admin.auth.admin.deleteUser(user.id)
})

test('deleting my account is blocked by a pending rental, then succeeds once resolved', async ({ page }) => {
  const renter = await createDisposableUser('delete-blocked')
  const { data: listing } = await admin.from('listings').select('id, owner_id, price_per_day').eq('title', 'Valenti Spirit city bike').single()

  const { data: rental } = await admin
    .from('rentals')
    .insert({
      listing_id: listing!.id,
      owner_id: listing!.owner_id,
      renter_id: renter.id,
      status: 'pending',
      start_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 11 * 86400000).toISOString().slice(0, 10),
      total_price: listing!.price_per_day,
    })
    .select('id')
    .single()

  await signInAs(page, renter.email, renter.password)

  const blockedResponse = await page.request.post('/api/account/delete')
  expect(blockedResponse.status()).toBe(400)
  const blockedBody = await blockedResponse.json()
  expect(blockedBody.error).toContain('active or pending rental')

  await admin.from('rentals').delete().eq('id', rental!.id)

  const okResponse = await page.request.post('/api/account/delete')
  expect(okResponse.status()).toBe(200)

  const { data: profile } = await admin.from('profiles').select('deleted_at, display_name').eq('id', renter.id).single()
  expect(profile?.deleted_at).not.toBeNull()
  expect(profile?.display_name).toBeNull()

  const { data: authUser } = await admin.auth.admin.getUserById(renter.id)
  expect(authUser.user?.email).toContain('deleted.rentify.invalid')

  await admin.auth.admin.deleteUser(renter.id)
})
