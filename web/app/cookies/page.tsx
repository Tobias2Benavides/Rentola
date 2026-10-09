import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Cookie Policy — Rentify',
}

export default function CookiesPage() {
  const { html } = loadLegalDoc('cookies')
  return <LegalPage html={html} />
}
