'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Phone, Mail, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', id_number: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*, policies(id)')
      .order('created_at', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('clients').insert(form)
    setForm({ name: '', phone: '', email: '', id_number: '' })
    setShowAdd(false)
    setSaving(false)
    loadClients()
  }

  const filtered = clients.filter(c =>
    c.name.includes(search) || c.phone?.includes(search) || c.email?.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-1">{clients.length} לקוחות במערכת</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> הוסף לקוח
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute right-3 top-3 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או מייל..."
          className="w-full pr-9 pl-4 py-2.5 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-20">אין לקוחות להצגה</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(client => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      <div className="flex items-center gap-4 mt-1">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Phone size={11} /> {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Mail size={11} /> {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {(client as any).policies?.length ?? 0} פוליסות
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(client.created_at)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">הוספת לקוח חדש</h2>
            <form onSubmit={addClient} className="space-y-3">
              {[
                { key: 'name', placeholder: 'שם מלא *', required: true },
                { key: 'phone', placeholder: 'טלפון' },
                { key: 'email', placeholder: 'אימייל', type: 'email' },
                { key: 'id_number', placeholder: 'תעודת זהות' },
              ].map(({ key, placeholder, required, type }) => (
                <input key={key} required={required} type={type ?? 'text'}
                  value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {saving ? 'שומר...' : 'הוסף לקוח'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 text-sm">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
