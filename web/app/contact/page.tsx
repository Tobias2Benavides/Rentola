import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Contact & Legal Info — Rentify',
}

export default function ContactPage() {
  const { html } = loadLegalDoc('contact')
  return <LegalPage html={html} />
}
