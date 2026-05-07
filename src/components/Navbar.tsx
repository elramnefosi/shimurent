'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Bell, Settings, Shield, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'לקוחות', icon: Users },
  { href: '/alerts', label: 'התראות', icon: Bell },
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()
  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">שימורנט</div>
            <div className="text-slate-400 text-xs">מערכת שימור לקוחות</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              pathname === href ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full">
          <LogOut size={18} />
          יציאה
        </button>
      </div>
    </aside>
  )
}
