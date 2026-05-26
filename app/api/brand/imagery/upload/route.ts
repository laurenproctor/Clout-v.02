import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, WebP, or GIF.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const uniqueId = crypto.randomUUID()
  const storagePath = `${session.workspaceId}/imagery/${uniqueId}.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)

  // Append to uploaded_imagery
  const { data: existing } = await supabase
    .from('brand_imagery_profiles')
    .select('uploaded_imagery')
    .eq('workspace_id', session.workspaceId)
    .single()

  const current: string[] = existing?.uploaded_imagery ?? []
  const { error: updateError } = await supabase
    .from('brand_imagery_profiles')
    .update({
      uploaded_imagery: [...current, publicUrl],
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', session.workspaceId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const supabase = await createClient()

  // Remove from storage
  const marker = '/brand-assets/'
  const markerIdx = url.indexOf(marker)
  if (markerIdx !== -1) {
    const storagePath = decodeURIComponent(url.slice(markerIdx + marker.length))
    if (storagePath.startsWith(session.workspaceId + '/')) {
      await supabase.storage.from('brand-assets').remove([storagePath])
    }
  }

  // Remove from uploaded_imagery array
  const { data: existing } = await supabase
    .from('brand_imagery_profiles')
    .select('uploaded_imagery')
    .eq('workspace_id', session.workspaceId)
    .single()

  const newList = (existing?.uploaded_imagery ?? []).filter((u: string) => u !== url)
  await supabase
    .from('brand_imagery_profiles')
    .update({ uploaded_imagery: newList, updated_at: new Date().toISOString() })
    .eq('workspace_id', session.workspaceId)

  return NextResponse.json({ success: true })
}
