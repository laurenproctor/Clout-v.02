import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxBytes = 5 * 1024 * 1024
  if (file.size > maxBytes) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })

  const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, SVG, or WebP.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${session.workspaceId}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
