import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { analyzeContentForOpportunities } from '@/lib/website-intelligence/analyze'
import { mergeIntoCache, readCache, writeCache } from '../_cache'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type

  // PDF — use Claude's native document API for best extraction
  if (ext === 'pdf' || mime === 'application/pdf') {
    const buf = await file.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (client.messages.create as any)({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extract all key content: services, case studies, testimonials, statistics, proof points, and notable claims. Be thorough.' },
          ],
        }],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (res as any).content.filter((b: any) => b.type === 'text').map((b: any) => b.text as string).join('')
    } catch {
      return `PDF document: ${file.name}`
    }
  }

  // Word doc — best-effort text extraction
  if (['doc', 'docx'].includes(ext) || mime.includes('wordprocessingml') || mime.includes('msword')) {
    try {
      const raw = await file.text()
      const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim()
      if (readable.length > 200) return readable.slice(0, 12000)
    } catch {}
    return `Word document: ${file.name}. (For best results, save as PDF or TXT.)`
  }

  // Plain text, markdown, CSV etc.
  if (mime.startsWith('text/') || ['txt', 'md', 'markdown', 'csv', 'rtf'].includes(ext)) {
    return (await file.text()).slice(0, 12000)
  }

  throw new Error(`Unsupported file type: ${file.name}. Please use PDF, DOC, DOCX, or TXT.`)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let file: File
  let sourceName: string
  try {
    const form = await req.formData()
    const f = form.get('file')
    if (!(f instanceof File)) throw new Error('no file')
    if (f.size > MAX_FILE_BYTES) throw new Error(`File too large (max 10 MB)`)
    file = f
    sourceName = form.get('source_name') as string || file.name
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid upload' }, { status: 400 })
  }

  let text: string
  try {
    text = await extractText(file)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not read file' }, { status: 422 })
  }

  const supabase = await createClient()

  // Use the workspace's website URL as the source URL if available
  const { data: ws } = await supabase
    .from('workspace_feed_settings')
    .select('website_url')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()
  const websiteUrl = ws?.website_url ?? 'uploaded-document'

  let newResult
  try {
    newResult = await analyzeContentForOpportunities(text, websiteUrl, sourceName)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload] analysis failed:', msg)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 422 })
  }

  const existing = await readCache(supabase, session.workspaceId)
  const merged = mergeIntoCache(existing, newResult)
  await writeCache(supabase, session.workspaceId, merged)

  return NextResponse.json({
    configured: true,
    website_url: websiteUrl,
    items: merged.items,
    gaps: merged.gaps,
    assets: merged.assets,
  })
}
