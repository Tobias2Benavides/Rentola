import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Terms of Service — Rentify',
}

export default function TermsPage() {
  const { html } = loadLegalDoc('terms')
  return <LegalPage html={html} />
}
