import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { signInAs } from './auth'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function createDisposableUser(prefix: string) {
  const email = `${prefix}-${Date.now()}@rentifyapp.nl`
  const password = 'TestPassword123!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return { id: data.user.id, email, password }
}

test('filing a report against a listing creates a row visible only to the reporter', async ({ page }) => {
  const reporter = await createDisposableUser('report-filer')
  await signInAs(page, reporter.email, reporter.password)

  const { data: listing } = await admin.from('listings').select('id').eq('title', 'Valenti Spirit city bike').single()

  await page.goto(`/browse/${listing!.id}`)
  await page.getByRole('button', { name: 'Report this listing' }).click()
  await page.getByText('I confirm this report is accurate').click()
  await page.getByRole('button', { name: 'Submit report' }).click()

  await expect(page.getByText("Thanks — we'll review this")).toBeVisible()

  const { data: reports } = await admin
    .from('reports')
    .select('*')
    .eq('reporter_id', reporter.id)
    .eq('target_id', listing!.id)
  expect(reports).toHaveLength(1)
  expect(reports![0].status).toBe('open')

  await admin.from('reports').delete().eq('id', reports![0].id)
  await admin.auth.admin.deleteUser(reporter.id)
})

test('RLS: a report is only readable by its own reporter, not by another user', async ({ page }) => {
  void page // unused -- this test exercises Supabase RLS directly, not the UI
  const reporter = await createDisposableUser('rls-reporter')
  const other = await createDisposableUser('rls-other')

  const { data: listing } = await admin.from('listings').select('id').eq('title', 'Valenti Spirit city bike').single()
  const { data: report } = await admin
    .from('reports')
    .insert({ reporter_id: reporter.id, target_type: 'listing', target_id: listing!.id, reason: 'other', details: 'RLS test' })
    .select('id')
    .single()

  const reporterClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await reporterClient.auth.signInWithPassword({ email: reporter.email, password: reporter.password })
  const { data: ownReports } = await reporterClient.from('reports').select('id').eq('id', report!.id)
  expect(ownReports).toHaveLength(1)

  const otherClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await otherClient.auth.signInWithPassword({ email: other.email, password: other.password })
  const { data: strangerReports } = await otherClient.from('reports').select('id').eq('id', report!.id)
  expect(strangerReports).toHaveLength(0)

  await admin.from('reports').delete().eq('id', report!.id)
  await admin.auth.admin.deleteUser(reporter.id)
  await admin.auth.admin.deleteUser(other.id)
})
