'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Policy } from '@/types'
import { formatDate, policyTypeLabel } from '@/lib/utils'
import { ArrowRight, Upload, Trash2, FileText, TrendingUp, Users } from 'lucide-react'

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: p } = await supabase.from('policies').select('*').eq('client_id', id).order('created_at', { ascending: false })
    setClient(c)
    setPolicies(p ?? [])
    setLoading(false)
  }

  async function uploadPolicy(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    // Upload via server API (uses service role key)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('clientId', id)

    const uploadRes = await fetch('/api/upload-policy', { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) { alert('שגיאה בהעלאה: ' + uploadData.error); setUploading(false); return }

    const policy = uploadData.policy

    setUploading(false)
    setExtracting(true)

    // Extract with Claude
    await fetch('/api/extract-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: policy.id, fileUrl: policy.file_url }),
    })

    setExtracting(false)
    load()
    e.target.value = ''
  }

  async function deletePolicy(policyId: string) {
    if (!confirm('למחוק פוליסה זו?')) return
    await supabase.from('policies').delete().eq('id', policyId)
    load()
  }

  if (loading) return <div className="text-center text-slate-400 py-20">טוען...</div>
  if (!client) return <div className="text-center text-slate-400 py-20">לקוח לא נמצא</div>

  return (
    <div>
      <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowRight size={15} /> חזרה ללקוחות
      </button>

      {/* Client header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
              <div className="flex gap-4 mt-1 text-sm text-slate-500">
                {client.phone && <span>📞 {client.phone}</span>}
                {client.email && <span>✉️ {client.email}</span>}
                {client.id_number && <span>🪪 {client.id_number}</span>}
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400">לקוח מ-{formatDate(client.created_at)}</div>
        </div>
      </div>

      {/* Upload */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">פוליסות ({policies.length})</h2>
        <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
          ${uploading || extracting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          <Upload size={15} />
          {uploading ? 'מעלה...' : extracting ? 'Claude מנתח...' : 'העלה פוליסה PDF'}
          <input type="file" accept=".pdf" className="hidden" onChange={uploadPolicy} disabled={uploading || extracting} />
        </label>
      </div>

      {policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-40" />
          <p>אין פוליסות עדיין — העלה PDF ו-Claude ינתח אוטומטית</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {policies.map(policy => (
            <div key={policy.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {policy.company || 'חברה לא זוהתה'} — {policyTypeLabel(policy.policy_type)}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {policy.policy_number && <span>פוליסה: {policy.policy_number} • </span>}
                      {policy.current_price > 0 && <span>פרמיה: ₪{policy.current_price} • </span>}
                      <span>{policy.file_name}</span>
                    </div>
                    {policy.insured_names?.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <Users size={11} /> {policy.insured_names.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => deletePolicy(policy.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
              </div>

              {policy.increases?.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-3">
                    <TrendingUp size={14} /> עליות מחיר מתוכננות
                  </div>
                  <div className="grid gap-2">
                    {policy.increases.map((inc, i) => (
                      <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-700">{formatDate(inc.date)}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-orange-600 font-medium">₪{inc.new_price}</span>
                          {inc.percent_change > 0 && (
                            <span className="text-orange-500 text-xs bg-orange-100 px-2 py-0.5 rounded-full">
                              +{inc.percent_change}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!policy.extracted_at && (
                <div className="text-xs text-slate-400 mt-2">⏳ ממתין לניתוח...</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
