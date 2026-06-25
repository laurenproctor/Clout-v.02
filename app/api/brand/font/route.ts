import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// Keep in sync with the upload UI's accept list (components/brand/font-selector.tsx).
// All four render correctly: Puppeteer/browser @font-face supports every format, and Satori
// parses TTF/OTF/WOFF natively (it's woff2 that needs decompression — so ttf/otf are safe here).
const FONT_CONTENT_TYPES: Record<string, string> = {
  woff:  'font/woff',
  woff2: 'font/woff2',
  ttf:   'font/ttf',
  otf:   'font/otf',
}

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
  if (!ext || !(ext in FONT_CONTENT_TYPES)) {
    return NextResponse.json({ error: 'Only .woff, .woff2, .ttf, and .otf files supported' }, { status: 400 })
  }

  const path = `${session.workspaceId}/font-${role}.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, bytes, { contentType: file.type || FONT_CONTENT_TYPES[ext], upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, role })
}
