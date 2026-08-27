import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely. Only import this from
// trusted server code (API routes, webhooks) that has already verified
// who's asking and what they're allowed to touch. Never expose this
// client or its key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
