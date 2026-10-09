import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import TermsGateModal from '@/components/TermsGateModal'
import { CURRENT_TERMS_VERSION, TERMS_DOCUMENTS } from '@/lib/termsConfig'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: acceptances } = await supabase
    .from('terms_acceptances')
    .select('document, version')
    .eq('user_id', user.id)

  const latestVersionByDocument = new Map<string, number>()
  for (const row of acceptances ?? []) {
    const current = latestVersionByDocument.get(row.document) ?? 0
    if (row.version > current) latestVersionByDocument.set(row.document, row.version)
  }

  const outdatedDocuments = TERMS_DOCUMENTS.filter(
    ({ document }) => (latestVersionByDocument.get(document) ?? 0) < CURRENT_TERMS_VERSION
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <Footer />
      {outdatedDocuments.length > 0 && <TermsGateModal outdatedDocuments={outdatedDocuments} />}
    </div>
  )
}
