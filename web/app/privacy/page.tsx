import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Privacy Policy — Rentify',
}

export default function PrivacyPage() {
  const { html } = loadLegalDoc('privacy')
  return <LegalPage html={html} />
}
