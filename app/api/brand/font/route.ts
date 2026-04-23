import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const role = formData.get('role') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!role || !['heading', 'body'].includes(role)) {
    return NextResponse.json({ error: 'role must be heading or body' }, { status: 400 })
  }

  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['woff', 'woff2'].includes(ext)) {
    return NextResponse.json({ error: 'Only .woff and .woff2 files supported' }, { status: 400 })
  }

  const path = `${session.workspaceId}/font-${role}.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, bytes, { contentType: file.type || 'font/woff2', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, role })
}
