import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Get settings
  const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
  if (!settings?.agent_email) return NextResponse.json({ error: 'no agent email' }, { status: 400 })

  // Alert email (from alerts page)
  if (body.alertId) {
    const { data: alert } = await supabaseAdmin
      .from('alerts')
      .select('*, policy:policies(*, client:clients(*))')
      .eq('id', body.alertId)
      .single()

    if (!alert) return NextResponse.json({ error: 'alert not found' }, { status: 404 })

    const policy = alert.policy
    const client = policy?.client
    const increaseDate = format(new Date(alert.increase_date), 'dd/MM/yyyy')

    // Email to client
    if (client?.email) {
      await resend.emails.send({
        from: 'שימורנט <no-reply@shimurent.co.il>',
        to: client.email,
        subject: `עדכון חשוב על פוליסת הביטוח שלך — ${policy?.company}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
            <div style="background:#1e40af;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:22px;">שימורנט</h1>
              <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">מערכת שימור לקוחות</p>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="font-size:16px;">שלום <strong>${client.name}</strong>,</p>
              <p style="color:#475569;">אנו פועלים בשמך להגשת <strong>הנחת שימור</strong> לחברת הביטוח שלך.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
                <h3 style="margin:0 0 12px;color:#1e293b;">פרטי הפוליסה</h3>
                <table style="width:100%;font-size:14px;color:#475569;">
                  <tr><td style="padding:4px 0;"><strong>חברה:</strong></td><td>${policy?.company}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>מספר פוליסה:</strong></td><td>${policy?.policy_number || '—'}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>תאריך עלייה:</strong></td><td>${increaseDate}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>מחיר חדש:</strong></td><td>₪${alert.new_price}</td></tr>
                </table>
              </div>
              <p style="color:#475569;">הסוכן שלך, <strong>${settings.agent_name}</strong>, פועל להשגת הנחה עבורך בטרם העלייה.</p>
              <p style="color:#64748b;font-size:13px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
                לשאלות: ${settings.agent_email}
              </p>
            </div>
          </div>`,
      })

      await supabaseAdmin.from('alerts').update({ client_email_sent_at: new Date().toISOString(), status: 'sent' }).eq('id', body.alertId)
    }

    return NextResponse.json({ ok: true })
  }

  // Extraction notification to agent + referent
  if (body.policyId) {
    const { data: policy } = await supabaseAdmin
      .from('policies')
      .select('*, client:clients(*)')
      .eq('id', body.policyId)
      .single()

    if (!policy) return NextResponse.json({ error: 'policy not found' }, { status: 404 })

    const to = [settings.agent_email]
    if (settings.referent_email) to.push(settings.referent_email)

    const increases = (policy.increases ?? []) as Array<{ date: string; new_price: number; percent_change: number }>
    const increaseRows = increases.map(inc =>
      `<tr><td style="padding:4px 8px;">${format(new Date(inc.date), 'dd/MM/yyyy')}</td><td style="padding:4px 8px;">₪${inc.new_price}</td><td style="padding:4px 8px;">+${inc.percent_change}%</td></tr>`
    ).join('')

    await resend.emails.send({
      from: 'שימורנט <no-reply@shimurent.co.il>',
      to,
      subject: `📋 פוליסה חדשה נוספה — ${policy.client?.name} | ${policy.company}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#1e40af;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;">שימורנט — פוליסה חדשה</h1>
          </div>
          <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <h2 style="margin:0 0 20px;">פוליסה נוספה בהצלחה ✅</h2>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <table style="width:100%;font-size:14px;color:#475569;">
                <tr><td style="padding:5px 0;"><strong>לקוח:</strong></td><td>${policy.client?.name}</td></tr>
                <tr><td style="padding:5px 0;"><strong>מספר פוליסה:</strong></td><td>${policy.policy_number || '—'}</td></tr>
                <tr><td style="padding:5px 0;"><strong>חברת ביטוח:</strong></td><td>${policy.company || '—'}</td></tr>
                <tr><td style="padding:5px 0;"><strong>סוג פוליסה:</strong></td><td>${policy.policy_type || '—'}</td></tr>
                <tr><td style="padding:5px 0;"><strong>מבוטחים:</strong></td><td>${(policy.insured_names ?? []).join(', ') || '—'}</td></tr>
                <tr><td style="padding:5px 0;"><strong>פרמיה נוכחית:</strong></td><td>₪${policy.current_price}</td></tr>
              </table>
            </div>
            ${increases.length > 0 ? `
            <h3>עליות מחיר מתוכננות</h3>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr style="background:#f1f5f9;"><th style="padding:8px;text-align:right;">תאריך</th><th style="padding:8px;text-align:right;">מחיר חדש</th><th style="padding:8px;text-align:right;">אחוז</th></tr>
              ${increaseRows}
            </table>` : '<p style="color:#64748b;">לא זוהו עליות מחיר בפוליסה</p>'}
          </div>
        </div>`,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'missing params' }, { status: 400 })
}
