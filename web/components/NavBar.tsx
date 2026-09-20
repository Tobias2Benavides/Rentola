'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

const links = [
  { href: '/browse', label: 'Browse' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/listings', label: 'My Listings' },
  { href: '/earnings', label: 'Earnings' },
  { href: '/profile', label: 'Profile' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/browse" className="text-xl font-bold tracking-tight text-emerald-700">
          Rentify
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            )
          })}

          <NotificationBell />

          <button
            onClick={handleSignOut}
            className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
