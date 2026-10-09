import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// "Delete my account" -- the DB side (anonymize profile, deactivate
// listings, set deleted_at) happens in the request_account_deletion
// RPC, which runs as the user and blocks on an open rental. This route
// adds the one piece that RPC can't do itself: randomizing the auth
// email/password via the service-role admin client so the account
// can't sign back in. See 018_account_deletion.sql for why this is an
// anonymizing soft delete, not a hard auth.users delete.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profileBefore } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  const { error: rpcError } = await supabase.rpc('request_account_deletion')
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 400 })
  }

  const admin = createAdminClient()

  if (profileBefore?.avatar_url) {
    await admin.storage.from('avatars').remove([profileBefore.avatar_url])
  }

  await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${user.id}@deleted.rentify.invalid`,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
  })

  return NextResponse.json({ deleted: true })
}
