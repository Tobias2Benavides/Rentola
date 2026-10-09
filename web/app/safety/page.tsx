import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Safety Tips — Rentify',
}

export default function SafetyPage() {
  const { html } = loadLegalDoc('safety')
  return <LegalPage html={html} />
}
