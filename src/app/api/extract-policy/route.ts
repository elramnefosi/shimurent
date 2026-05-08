import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { addDays, format } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { policyId, fileUrl } = await req.json()

  try {
    // Fetch PDF as base64
    const pdfRes = await fetch(fileUrl)
    const buffer = await pdfRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `נתח את פוליסת הביטוח הזו והחזר JSON בלבד (ללא מלל נוסף) עם המבנה הבא:
{
  "policy_number": "מספר הפוליסה",
  "company": "שם חברת הביטוח",
  "policy_type": "health|life|critical|accident|disability|other",
  "insured_names": ["שם מבוטח 1", "שם מבוטח 2"],
  "current_price": 150.00,
  "increases": [
    {
      "date": "YYYY-MM-DD",
      "new_price": 200.00,
      "percent_change": 10,
      "reason": "discount|age|both|unknown",
      "reason_note": "הסבר קצר — למשל: ירידה בהנחה מ-20% ל-10%, או עלייה בגיל 55"
    }
  ]
}

לגבי שדה "reason" — זהה את הסיבה לעלייה:
- "discount" — אם העלייה נובעת מירידה בהנחה / שינוי במדרג ההנחות בפוליסה (ניתן לפעול לגביה)
- "age" — אם העלייה נובעת ממעבר לקבוצת גיל יקרה יותר (לא ניתן למנוע)
- "both" — אם שני הגורמים משפיעים
- "unknown" — אם לא ניתן לזהות את הסיבה

חפש בפוליסה: טבלאות הנחות, מדרג גיל, לוחות פרמיה, ותנאי שינוי מחיר.
אם מידע לא קיים — השתמש בערכי ברירת מחדל (מחרוזת ריקה, מספר 0, מערך ריק).`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    // Save to DB
    await supabaseAdmin.from('policies').update({
      policy_number: extracted.policy_number ?? '',
      company: extracted.company ?? '',
      policy_type: extracted.policy_type ?? 'other',
      insured_names: extracted.insured_names ?? [],
      current_price: extracted.current_price ?? 0,
      increases: extracted.increases ?? [],
      extracted_at: new Date().toISOString(),
    }).eq('id', policyId)

    // Create alerts (60 days before each increase)
    const increases: Array<{ date: string; new_price: number; percent_change: number }> = extracted.increases ?? []
    for (const inc of increases) {
      const increaseDate = new Date(inc.date)
      const alertDate = addDays(increaseDate, -60)
      if (alertDate > new Date()) {
        await supabaseAdmin.from('alerts').upsert({
          policy_id: policyId,
          increase_date: format(increaseDate, 'yyyy-MM-dd'),
          new_price: inc.new_price,
          percent_change: inc.percent_change ?? 0,
          status: 'pending',
        })
      }
    }

    // Send agent notification
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId, type: 'extraction' }),
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('extract-policy error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
