import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const clientId = formData.get('clientId') as string

  if (!file || !clientId) {
    return NextResponse.json({ error: 'missing file or clientId' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeName = `${Date.now()}_policy.pdf`
  const path = `${clientId}/${safeName}`

  const { error } = await supabaseAdmin.storage
    .from('shimornet')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('shimornet')
    .getPublicUrl(path)

  const { data: policy, error: dbError } = await supabaseAdmin
    .from('policies')
    .insert({ client_id: clientId, file_url: publicUrl, file_name: file.name })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ policy })
}
