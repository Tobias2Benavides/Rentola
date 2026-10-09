import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/rental-agreement', label: 'Rental Agreement' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/prohibited', label: 'Prohibited items' },
  { href: '/safety', label: 'Safety' },
  { href: '/contact', label: 'Contact/Legal' },
  { href: '/contact#report', label: 'Report a problem' },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-400">
        {FOOTER_LINKS.map(({ href, label }, i) => (
          <span key={href} className="flex items-center gap-x-4">
            <Link href={href} className="hover:text-gray-600">
              {label}
            </Link>
            {i < FOOTER_LINKS.length - 1 && <span aria-hidden>·</span>}
          </span>
        ))}
      </div>
    </footer>
  )
}
