'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Policy, FamilyMember } from '@/types'
import { formatDate, policyTypeLabel } from '@/lib/utils'
import { ArrowRight, Upload, Trash2, FileText, TrendingUp, Users, UserPlus, X } from 'lucide-react'

const RELATIONS = ['בעל/אישה', 'בן', 'בת', 'אב', 'אם', 'אח', 'אחות', 'אחר']

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberForm, setMemberForm] = useState({ name: '', id_number: '', relation: '', gender: '', birth_date: '' })
  const [savingMember, setSavingMember] = useState(false)
  const [showEditClient, setShowEditClient] = useState(false)
  const [editForm, setEditForm] = useState({ birth_date: '', address: '', phone: '', email: '', id_number: '' })
  const [savingClient, setSavingClient] = useState(false)

  function openEditClient() {
    if (!client) return
    setEditForm({
      birth_date: client.birth_date ?? '',
      address: client.address ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      id_number: client.id_number ?? '',
    })
    setShowEditClient(true)
  }

  async function saveClient(e: React.SyntheticEvent) {
    e.preventDefault()
    setSavingClient(true)
    await supabase.from('clients').update(editForm).eq('id', id)
    setShowEditClient(false)
    setSavingClient(false)
    load()
  }

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: p } = await supabase.from('policies').select('*').eq('client_id', id).order('created_at', { ascending: false })
    const { data: m } = await supabase.from('family_members').select('*').eq('client_id', id).order('created_at', { ascending: true })
    setClient(c)
    setPolicies(p ?? [])
    setMembers(m ?? [])
    setLoading(false)
  }

  async function addMember(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!memberForm.name.trim()) return
    setSavingMember(true)
    await supabase.from('family_members').insert({ client_id: id, ...memberForm })
    setMemberForm({ name: '', id_number: '', relation: '', gender: '', birth_date: '' })
    setShowAddMember(false)
    setSavingMember(false)
    load()
  }

  async function deleteMember(memberId: string) {
    if (!confirm('למחוק בן משפחה זה?')) return
    await supabase.from('family_members').delete().eq('id', memberId)
    load()
  }

  async function uploadPolicy(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('clientId', id)
    const uploadRes = await fetch('/api/upload-policy', { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) { alert('שגיאה בהעלאה: ' + uploadData.error); setUploading(false); return }
    const policy = uploadData.policy
    setUploading(false)
    setExtracting(true)
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
              <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                {client.phone && <span>📞 {client.phone}</span>}
                {client.email && <span>✉️ {client.email}</span>}
                {client.id_number && <span>🪪 {client.id_number}</span>}
                {client.birth_date && <span>🎂 {formatDate(client.birth_date)}</span>}
                {client.address && <span>📍 {client.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-slate-400">לקוח מ-{formatDate(client.created_at)}</div>
            <button onClick={openEditClient}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              ✏️ עריכה
            </button>
          </div>
        </div>
      </div>

      {/* Edit client modal */}
      {showEditClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditClient(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">עריכת פרטי לקוח</h3>
            <form onSubmit={saveClient} className="space-y-3" dir="rtl">
              <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                placeholder="טלפון" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={editForm.email} type="email" onChange={e => setEditForm({...editForm, email: e.target.value})}
                placeholder="אימייל" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={editForm.id_number} onChange={e => setEditForm({...editForm, id_number: e.target.value})}
                placeholder="תעודת זהות" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}
                placeholder="כתובת" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div>
                <label className="block text-xs text-slate-500 mb-1">תאריך לידה</label>
                <input type="date" value={editForm.birth_date} onChange={e => setEditForm({...editForm, birth_date: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingClient}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {savingClient ? 'שומר...' : 'שמור'}
                </button>
                <button type="button" onClick={() => setShowEditClient(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 text-sm">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Family members */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users size={17} /> בני משפחה ({members.length})
          </h2>
          <button onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <UserPlus size={15} /> הוסף
          </button>
        </div>

        {members.length === 0 ? (
          <p className="text-slate-400 text-sm">אין בני משפחה — הוסף ילדים, בן/בת זוג</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-slate-800">{m.name}</span>
                  {m.relation && <span className="text-xs text-slate-500 mr-1.5">({m.relation})</span>}
                  {m.gender && <span className="text-xs text-slate-400 mr-1">{m.gender}</span>}
                  {m.id_number && <span className="text-xs text-slate-400 mr-1">ת.ז. {m.id_number}</span>}
                  {(m as any).birth_date && <span className="text-xs text-slate-400 mr-1">🎂 {formatDate((m as any).birth_date)}</span>}
                </div>
                <button onClick={() => deleteMember(m.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add member modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMember(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">הוספת בן/בת משפחה</h3>
              <form onSubmit={addMember} className="space-y-3">
                <input required value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="שם מלא *"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={memberForm.id_number} onChange={e => setMemberForm({ ...memberForm, id_number: e.target.value })}
                  placeholder="תעודת זהות"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={memberForm.relation} onChange={e => setMemberForm({ ...memberForm, relation: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">קשר משפחתי</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={memberForm.gender} onChange={e => setMemberForm({ ...memberForm, gender: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">מין</option>
                  <option value="זכר">זכר</option>
                  <option value="נקבה">נקבה</option>
                </select>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">תאריך לידה</label>
                  <input type="date" value={memberForm.birth_date} onChange={e => setMemberForm({ ...memberForm, birth_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={savingMember}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
                    {savingMember ? 'שומר...' : 'הוסף'}
                  </button>
                  <button type="button" onClick={() => setShowAddMember(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 text-sm">
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Policies */}
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
              {!policy.extracted_at && <div className="text-xs text-slate-400 mt-2">⏳ ממתין לניתוח...</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
