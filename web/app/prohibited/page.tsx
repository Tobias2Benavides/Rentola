import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Prohibited Items & Conduct — Rentify',
}

export default function ProhibitedPage() {
  const { html } = loadLegalDoc('prohibited')
  return <LegalPage html={html} />
}
