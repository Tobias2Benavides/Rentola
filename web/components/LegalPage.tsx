import Link from 'next/link'

// Shared shell for every /terms, /privacy, /cookies, etc. page -- renders
// pre-converted markdown HTML (see lib/legal.ts) inside consistent prose
// styling. The source .md files carry their own "DRAFT -- pending legal
// review" notice and version/date line, so this shell doesn't duplicate it.
export default function LegalPage({ html }: { html: string }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-emerald-700">
            Rentify
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            ← Back home
          </Link>
        </div>
      </header>

      <main
        className="prose prose-gray mx-auto max-w-2xl px-6 py-16 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
