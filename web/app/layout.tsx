import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rentify',
  description: 'Rent anything from people nearby',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
