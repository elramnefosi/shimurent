'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Settings } from '@/types'
import { Save, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState({ agent_name: '', agent_email: '', referent_email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) {
      setSettings(data)
      setForm({ agent_name: data.agent_name, agent_email: data.agent_email, referent_email: data.referent_email })
    }
  }

  async function saveSettings(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', settings!.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">הגדרות</h1>
        <p className="text-slate-500 text-sm mt-1">פרטי הסוכן והרפרנטית — מוגדר פעם אחת</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={saveSettings} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">שם הסוכן</label>
            <input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })}
              placeholder="שם מלא" className="field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל הסוכן</label>
            <input type="email" value={form.agent_email} onChange={e => setForm({ ...form, agent_email: e.target.value })}
              placeholder="agent@example.com" className="field" />
            <p className="text-xs text-slate-400 mt-1">לכאן יישלחו כל ההתראות על עליות מחיר</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל הרפרנטית</label>
            <input type="email" value={form.referent_email} onChange={e => setForm({ ...form, referent_email: e.target.value })}
              placeholder="referent@example.com" className="field" />
            <p className="text-xs text-slate-400 mt-1">תקבל עותק של כל ההתראות</p>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {saved ? <><CheckCircle size={16} /> נשמר!</> : <><Save size={16} /> {saving ? 'שומר...' : 'שמור הגדרות'}</>}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>איך המערכת עובדת:</strong>
        <ul className="mt-2 space-y-1 text-blue-600 list-disc list-inside">
          <li>המערכת בודקת מדי יום פוליסות שעומדות לעלות ב-60 ימים הקרובים</li>
          <li>נשלחת התראה אוטומטית לסוכן ולרפרנטית עם פרטי הפוליסה</li>
          <li>הסוכן שולח ידנית מייל ללקוח בלחיצת כפתור מדף ההתראות</li>
        </ul>
      </div>

      <style jsx>{`
        .field { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
        .field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>
    </div>
  )
}
