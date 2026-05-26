import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, SVG, or WebP.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const uniqueId = crypto.randomUUID()
  const storagePath = `${session.workspaceId}/logos/${uniqueId}.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)

  // Append to logo_library and set as active logo_url
  const { data: existing } = await supabase
    .from('brand_profiles')
    .select('logo_library')
    .eq('workspace_id', session.workspaceId)
    .single()

  const library: string[] = existing?.logo_library ?? []
  const { error: updateError } = await supabase
    .from('brand_profiles')
    .update({
      logo_url: publicUrl,
      logo_library: [...library, publicUrl],
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

  // Extract storage path from public URL
  const marker = '/brand-assets/'
  const markerIdx = url.indexOf(marker)
  if (markerIdx !== -1) {
    const storagePath = decodeURIComponent(url.slice(markerIdx + marker.length))
    // Only delete paths that belong to this workspace
    if (storagePath.startsWith(session.workspaceId + '/')) {
      await supabase.storage.from('brand-assets').remove([storagePath])
    }
  }

  // Remove from library and unset logo_url if it was the active one
  const { data: existing } = await supabase
    .from('brand_profiles')
    .select('logo_url, logo_library')
    .eq('workspace_id', session.workspaceId)
    .single()

  const newLibrary = (existing?.logo_library ?? []).filter((u: string) => u !== url)
  const newActive = existing?.logo_url === url ? (newLibrary[0] ?? null) : existing?.logo_url

  await supabase
    .from('brand_profiles')
    .update({
      logo_url: newActive,
      logo_library: newLibrary,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', session.workspaceId)

  return NextResponse.json({ success: true })
}
