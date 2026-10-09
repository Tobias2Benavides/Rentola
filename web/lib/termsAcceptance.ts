import type { SupabaseClient } from '@supabase/supabase-js'
import { CURRENT_TERMS_VERSION, TERMS_DOCUMENTS } from '@/lib/termsConfig'

// Records acceptance of all three click-wrap documents at the current
// version for the signed-in user. Safe to call repeatedly -- it always
// inserts a fresh row, which is what we want for an audit trail (see
// terms_acceptances in 014_terms_acceptance.sql); the gate just looks at
// the latest row per document.
export async function recordTermsAcceptance(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('terms_acceptances').insert(
    TERMS_DOCUMENTS.map(({ document }) => ({
      user_id: user.id,
      document,
      version: CURRENT_TERMS_VERSION,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }))
  )
}
