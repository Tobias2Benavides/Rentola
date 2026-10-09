import LegalPage from '@/components/LegalPage'
import { loadLegalDoc } from '@/lib/legal'

export const metadata = {
  title: 'Rental Agreement — Rentify',
}

export default function RentalAgreementPage() {
  const { html } = loadLegalDoc('rental-agreement')
  return <LegalPage html={html} />
}
