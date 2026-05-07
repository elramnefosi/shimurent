import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'שימורנט — מערכת שימור לקוחות',
  description: 'ניהול פוליסות ביטוח והתראות שימור',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex">
        <Navbar />
        <main className="flex-1 mr-64 p-8 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
