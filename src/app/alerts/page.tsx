'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Alert } from '@/types'
import { formatDate, daysUntil, alertUrgency, policyTypeLabel } from '@/lib/utils'
import { Bell, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select(`*, policy:policies(*, client:clients(*))`)
      .order('increase_date', { ascending: true })
    setAlerts(data ?? [])
    setLoading(false)
  }

  async function sendClientEmail(alert: Alert) {
    setSending(alert.id)
    await fetch('/api/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.id }),
    })
    setSending(null)
    loadAlerts()
  }

  async function markHandled(alertId: string) {
    await supabase.from('alerts').update({ status: 'handled' }).eq('id', alertId)
    loadAlerts()
  }

  const pending = alerts.filter(a => a.status !== 'handled' && daysUntil(a.increase_date) <= 90)
  const handled = alerts.filter(a => a.status === 'handled')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">התראות שימור</h1>
        <p className="text-slate-500 text-sm mt-1">
          {pending.length} פוליסות ממתינות לטיפול
        </p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20">טוען...</div>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-500">אין התראות פעילות</p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map(alert => {
            const days = daysUntil(alert.increase_date)
            const urgency = alertUrgency(days)
            const policy = alert.policy
            const client = policy?.client

            return (
              <div key={alert.id} className={cn(
                'bg-white rounded-xl border p-5 flex items-start justify-between gap-4',
                urgency === 'critical' && 'border-red-200 bg-red-50',
                urgency === 'warning' && 'border-amber-200 bg-amber-50',
                urgency === 'info' && 'border-slate-200'
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    urgency === 'critical' && 'bg-red-100 text-red-600',
                    urgency === 'warning' && 'bg-amber-100 text-amber-600',
                    urgency === 'info' && 'bg-blue-100 text-blue-600'
                  )}>
                    {urgency === 'critical' ? <AlertTriangle size={18} /> : <Clock size={18} />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{client?.name}</div>
                    <div className="text-sm text-slate-600 mt-0.5 space-y-0.5">
                      <div>פוליסה: <span className="font-medium">{policy?.policy_number || '—'}</span></div>
                      <div>חברה: <span className="font-medium">{policy?.company || '—'}</span></div>
                      <div>סוג: <span className="font-medium">{policyTypeLabel(policy?.policy_type ?? '')}</span></div>
                      {policy?.insured_names && policy.insured_names.length > 0 && (
                        <div>מבוטחים: <span className="font-medium">{policy.insured_names.join(', ')}</span></div>
                      )}
                    </div>
                    <div className={cn(
                      'inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                      urgency === 'critical' && 'bg-red-100 text-red-700',
                      urgency === 'warning' && 'bg-amber-100 text-amber-700',
                      urgency === 'info' && 'bg-blue-100 text-blue-700'
                    )}>
                      {days <= 0 ? 'עלה כבר!' : `${days} ימים לעלייה`} — {formatDate(alert.increase_date)} — ₪{alert.new_price}
                    </div>
                    {alert.client_email_sent_at && (
                      <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={11} /> מייל נשלח ללקוח {formatDate(alert.client_email_sent_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => sendClientEmail(alert)} disabled={sending === alert.id}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                    <Send size={13} /> {sending === alert.id ? 'שולח...' : 'שלח מייל ללקוח'}
                  </button>
                  <button onClick={() => markHandled(alert.id)}
                    className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                    <CheckCircle size={13} /> סמן כטופל
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {handled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">טופל</h2>
          <div className="space-y-2">
            {handled.map(alert => (
              <div key={alert.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between opacity-60">
                <div className="text-sm text-slate-600">
                  {alert.policy?.client?.name} — {alert.policy?.company} — {formatDate(alert.increase_date)}
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
