import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Rentify',
  description: 'Rent anything from people nearby',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rentify',
  },
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
