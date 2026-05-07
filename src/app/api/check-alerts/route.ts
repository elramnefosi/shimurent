import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { differenceInDays, format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Call this daily via cron (e.g. Vercel Cron or external scheduler)
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const authHeader = req.headers.get('authorization')
  const isManual = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
  if (!settings?.agent_email) return NextResponse.json({ error: 'no settings' })

  // Get all pending alerts with policy+client data
  const { data: alerts } = await supabaseAdmin
    .from('alerts')
    .select('*, policy:policies(*, client:clients(*))')
    .eq('status', 'pending')

  if (!alerts?.length) return NextResponse.json({ ok: true, sent: 0 })

  const upcoming = alerts.filter(a => {
    const days = differenceInDays(new Date(a.increase_date), new Date())
    return days >= 0 && days <= 60
  })

  if (!upcoming.length) return NextResponse.json({ ok: true, sent: 0 })

  const rows = upcoming.map(a => {
    const p = a.policy
    const c = p?.client
    const days = differenceInDays(new Date(a.increase_date), new Date())
    return `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 8px;"><strong>${c?.name}</strong></td>
        <td style="padding:10px 8px;">${p?.policy_number || '—'}</td>
        <td style="padding:10px 8px;">${p?.company || '—'}</td>
        <td style="padding:10px 8px;">${p?.policy_type || '—'}</td>
        <td style="padding:10px 8px;">${(p?.insured_names ?? []).join(', ') || '—'}</td>
        <td style="padding:10px 8px;">${format(new Date(a.increase_date), 'dd/MM/yyyy')}</td>
        <td style="padding:10px 8px;">₪${a.new_price}</td>
        <td style="padding:10px 8px;color:${days <= 30 ? '#dc2626' : '#d97706'};font-weight:600;">${days} ימים</td>
      </tr>`
  }).join('')

  const to = [settings.agent_email]
  if (settings.referent_email) to.push(settings.referent_email)

  await resend.emails.send({
    from: 'שימורנט <no-reply@shimurent.co.il>',
    to,
    subject: `⚠️ ${upcoming.length} פוליסות עומדות לעלות — נדרש טיפול שימור`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;color:#1e293b;">
        <div style="background:#1e40af;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">שימורנט — התראת שימור יומית</h1>
          <p style="color:#93c5fd;margin:4px 0 0;">${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;margin-bottom:24px;">
            נמצאו <strong>${upcoming.length} פוליסות</strong> שעומדות לעלות ב-60 הימים הקרובים ומחייבות הגשת הנחת שימור:
          </p>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr style="background:#f1f5f9;font-weight:bold;">
              <th style="padding:10px 8px;text-align:right;">לקוח</th>
              <th style="padding:10px 8px;text-align:right;">פוליסה</th>
              <th style="padding:10px 8px;text-align:right;">חברה</th>
              <th style="padding:10px 8px;text-align:right;">סוג</th>
              <th style="padding:10px 8px;text-align:right;">מבוטחים</th>
              <th style="padding:10px 8px;text-align:right;">תאריך עלייה</th>
              <th style="padding:10px 8px;text-align:right;">מחיר חדש</th>
              <th style="padding:10px 8px;text-align:right;">ימים</th>
            </tr>
            ${rows}
          </table>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">
            לכניסה למערכת וטיפול: <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts">לחץ כאן</a>
          </p>
        </div>
      </div>`,
  })

  return NextResponse.json({ ok: true, sent: upcoming.length })
}
