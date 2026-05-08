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
      const today = format(new Date(), 'dd/MM/yyyy')
      await resend.emails.send({
        from: 'אלרם סוכנות לביטוח <elram@gal-almagor.co.il>',
        replyTo: settings.agent_email,
        to: client.email,
        subject: `הודעה חשובה בנוגע לפוליסת הביטוח שלך — ${policy?.company}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

            <!-- Header -->
            <div style="background:#0f172a;padding:28px 36px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="color:white;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">אלרם נפוסי</div>
                <div style="color:#94a3b8;font-size:13px;margin-top:2px;">סוכנות לביטוח ופיננסים</div>
              </div>
              <div style="color:#64748b;font-size:13px;">${today}</div>
            </div>

            <!-- Body -->
            <div style="background:white;padding:36px;">

              <p style="font-size:16px;margin:0 0 20px;">לכבוד,</p>
              <p style="font-size:16px;font-weight:bold;margin:0 0 24px;">${client.name} שלום,</p>

              <p style="color:#334155;line-height:1.8;font-size:15px;margin:0 0 16px;">
                הנני לעדכנך כי <strong>עומדת לחול עלייה במחיר הפרמיה</strong> של פוליסת הביטוח שלך בחברת <strong>${policy?.company}</strong>,
                החל מתאריך <strong>${increaseDate}</strong>.
              </p>

              <p style="color:#334155;line-height:1.8;font-size:15px;margin:0 0 16px;">
                כסוכן הביטוח שלך, <strong>אני פועל כבר עתה מול חברת הביטוח</strong> לטיפול בבקשת הנחת שימור עבורך,
                במטרה למנוע את העלייה הצפויה ולשמור על תנאי הפוליסה הקיימים.
              </p>

              <p style="color:#334155;line-height:1.8;font-size:15px;margin:0 0 24px;">
                <strong>אין צורך בכל פעולה מצדך</strong> — אנו מטפלים בכך בשמך וניידע אותך בתוצאות בהקדם.
              </p>

              <!-- Policy details box -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-right:4px solid #1e40af;border-radius:8px;padding:20px;margin:24px 0;">
                <div style="font-weight:bold;color:#1e293b;margin-bottom:14px;font-size:14px;">פרטי הפוליסה</div>
                <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;width:40%;"><strong>חברת ביטוח:</strong></td><td>${policy?.company}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>מספר פוליסה:</strong></td><td>${policy?.policy_number || '—'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>סוג ביטוח:</strong></td><td>${policy?.policy_type || '—'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>תאריך עלייה:</strong></td><td style="color:#dc2626;font-weight:bold;">${increaseDate}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>מחיר חדש צפוי:</strong></td><td style="color:#dc2626;font-weight:bold;">₪${alert.new_price} לחודש</td></tr>
                </table>
              </div>

              <p style="color:#334155;line-height:1.8;font-size:15px;margin:0 0 8px;">
                לשאלות ובירורים ניתן לפנות אליי ישירות:
              </p>

              <!-- Agent signature -->
              <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;">
                <div style="font-weight:bold;font-size:15px;color:#0f172a;">${settings.agent_name}</div>
                <div style="color:#64748b;font-size:13px;margin-top:4px;">סוכן ביטוח מורשה | אלרם סוכנות לביטוח</div>
                <div style="color:#3b82f6;font-size:13px;margin-top:4px;">${settings.agent_email}</div>
              </div>

            </div>

            <!-- Footer -->
            <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                הודעה זו נשלחה אוטומטית ממערכת ניהול הפוליסות של אלרם סוכנות לביטוח
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
