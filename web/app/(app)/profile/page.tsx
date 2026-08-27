import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import ConnectStripeButton from '@/components/ConnectStripeButton'
import type { Profile } from '@/lib/types'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single<Profile>()

  const displayName = profile?.display_name ?? ''
  const bio = profile?.bio ?? ''
  const avatarPath = profile?.avatar_url ?? null

  let avatarUrl: string | null = null
  if (avatarPath) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    avatarUrl = data.publicUrl
  }

  const isIncomplete = !displayName || !bio || !avatarUrl

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <Link
          href="/profile/edit"
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Edit
        </Link>
      </div>

      {/* Completion prompt */}
      {isIncomplete && (
        <div className="flex items-start gap-4 rounded-2xl bg-blue-50 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Complete your profile</p>
            <p className="mt-0.5 text-sm text-blue-700">
              Build trust with other renters by adding your name, photo, and bio.
            </p>
            <Link
              href="/profile/edit"
              className="mt-3 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      )}

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 pt-4 text-center">
        <div className="relative h-24 w-24">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {displayName ? (
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
        ) : (
          <p className="text-lg font-semibold text-gray-400">Set up your profile</p>
        )}

        {bio ? (
          <p className="max-w-sm text-gray-500">{bio}</p>
        ) : (
          <p className="text-gray-300">Add a bio to let others know about you</p>
        )}

        {/* Rating placeholder */}
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm text-gray-400">No reviews yet</span>
        </div>
      </div>

      {/* Payouts */}
      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5">
        <p className="font-semibold text-gray-900">Payouts</p>
        <p className="text-sm text-gray-500">
          {profile?.stripe_onboarding_complete
            ? 'Your Stripe account is connected — you can approve rental requests and get paid.'
            : 'Connect a Stripe account to get paid when you approve rental requests.'}
        </p>
        <ConnectStripeButton isConnected={Boolean(profile?.stripe_onboarding_complete)} />
      </div>
    </div>
  )
}
