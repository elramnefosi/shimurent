import type { Metadata } from 'next'
import './globals.css'
import NavbarWrapper from '@/components/NavbarWrapper'

export const metadata: Metadata = {
  title: 'שימורנט — מערכת שימור לקוחות',
  description: 'ניהול פוליסות ביטוח והתראות שימור',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex">
        <NavbarWrapper />
        <main className="flex-1 min-h-screen mr-64 p-8">{children}</main>
      </body>
    </html>
  )
}
