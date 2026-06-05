import type { Metadata, Viewport } from 'next'
import { Geist, Josefin_Sans, Bebas_Neue } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Providers from './providers'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const josefinSans = Josefin_Sans({
  variable: '--font-josefin-sans',
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
})
const bebasNeue = Bebas_Neue({
  variable: '--font-bebas-neue',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'YVY Figurinhas',
  description: 'Troca de figurinhas da Copa do Mundo 2026 – Condomínio YVY Lindóia',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YVY Figurinhas',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a433b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${josefinSans.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-yvy-bg text-yvy-text">
        <Providers>
          <Header />
          <main
            className="flex-1 flex flex-col overflow-y-auto"
            style={{ paddingTop: 'var(--header-h, 3.5rem)' }}
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
