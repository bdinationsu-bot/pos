'use client'
import './globals.css'
import Sidebar from './sidebar'
import { LanguageProvider, useLang } from '@/lib/i18n'
import { usePathname } from 'next/navigation'

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const isAuthPage = path === '/login'

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>
  }
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-gray-50">{children}</main>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>POS</title>
        <meta name="description" content="iPhone Second POS System" />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  )
}
