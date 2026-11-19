import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { signInAs } from './auth'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function createDisposableUser(prefix: string, isAdmin: boolean) {
  const email = `${prefix}-${Date.now()}@rentifyapp.nl`
  const password = 'TestPassword123!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  if (isAdmin) await admin.from('profiles').update({ is_admin: true }).eq('id', data.user.id)
  return { id: data.user.id, email, password }
}

test('a non-admin is redirected away from /admin/reports', async ({ page }) => {
  const user = await createDisposableUser('non-admin', false)
  await signInAs(page, user.email, user.password)

  await page.goto('/admin/reports')
  await expect(page).toHaveURL(/\/browse$/)

  await admin.auth.admin.deleteUser(user.id)
})

test('an admin sees the reports list', async ({ page }) => {
  const user = await createDisposableUser('is-admin', true)
  await signInAs(page, user.email, user.password)

  await page.goto('/admin/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  await admin.auth.admin.deleteUser(user.id)
})
