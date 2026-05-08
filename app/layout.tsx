import type { Metadata, Viewport } from 'next'
import { Geist, Josefin_Sans, Bebas_Neue } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

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
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a433b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${josefinSans.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-yvy-bg text-yvy-text">
        <Header />
        <main className="flex-1 pt-14">{children}</main>
      </body>
    </html>
  )
}
