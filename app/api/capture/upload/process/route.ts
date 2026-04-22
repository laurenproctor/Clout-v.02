import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth/session'
import { checkCaptureLimit, checkGenerationLimit } from '@/lib/auth/entitlements'
import { createCapture } from '@/lib/domain/capture'
import { callClaude, buildMultiDraftSystemPrompt } from '@/lib/ai/generate'
import { createClient } from '@/lib/supabase/server'

// 25 MB per file — matches Whisper's limit
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_FILES = 5
const ANGLES = ['Personal story', 'Contrarian take', 'Practical insight']

type FileCategory = 'text' | 'pdf' | 'doc' | 'image' | 'audio' | 'unsupported'

function categorize(file: File): FileCategory {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return 'image'
  if (mime.startsWith('audio/') || mime.startsWith('video/') || ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'mp4', 'mov'].includes(ext)) return 'audio'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext) || mime.includes('wordprocessingml') || mime.includes('msword')) return 'doc'
  if (mime.startsWith('text/') || ['txt', 'md', 'markdown', 'csv', 'json', 'rtf'].includes(ext)) return 'text'
  return 'unsupported'
}

async function extractText(file: File): Promise<string> {
  const category = categorize(file)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  switch (category) {
    case 'text': {
      const text = await file.text()
      return text.slice(0, 15000)
    }

    case 'pdf': {
      const buf = await file.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (client.messages.create as any)({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              },
              { type: 'text', text: 'Extract the key ideas, arguments, data points, and notable content from this document. Be thorough. Focus on content valuable for creating thought leadership posts.' },
            ],
          }],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (res as any).content.filter((b: any) => b.type === 'text').map((b: any) => b.text as string).join('')
      } catch {
        return `PDF document: ${file.name}`
      }
    }

    case 'doc': {
      // DOCX is binary — attempt text extraction, fall back gracefully
      try {
        const raw = await file.text()
        const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim()
        if (readable.length > 200) return readable.slice(0, 12000)
      } catch {}
      return `Word document: ${file.name}. (For best results, save as PDF or TXT.)`
    }

    case 'image': {
      const buf = await file.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      try {
        const res = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Describe all visible text, data, charts, and key information in this image. Focus on content valuable for creating thought leadership posts.' },
            ],
          }],
        })
        return res.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text as string).join('')
      } catch {
        return `Image: ${file.name}`
      }
    }

    case 'audio': {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
      const buf = await file.arrayBuffer()
      const formData = new FormData()
      formData.append('file', new Blob([buf], { type: file.type || 'audio/mpeg' }), file.name)
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      })
      if (!res.ok) throw new Error('Audio transcription failed')
      const { text } = await res.json()
      return text
    }

    default:
      throw new Error(`Unsupported file type: ${file.name}`)
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  const lensId = formData.get('lens_id') as string | null

  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} exceeds the 25 MB limit` }, { status: 400 })
    }
    if (categorize(file) === 'unsupported') {
      return NextResponse.json({ error: `${file.name} is not a supported file type` }, { status: 400 })
    }
  }

  const captureLimit = await checkCaptureLimit(session.workspaceId)
  if (!captureLimit.allowed) {
    return NextResponse.json({ error: 'Monthly capture limit reached', code: 'CAPTURE_LIMIT_EXCEEDED' }, { status: 402 })
  }
  const genLimit = await checkGenerationLimit(session.workspaceId)
  if (!genLimit.allowed) {
    return NextResponse.json({ error: 'Monthly generation limit reached', code: 'GENERATION_LIMIT_EXCEEDED' }, { status: 402 })
  }

  // Extract content from all files
  const extractions = await Promise.allSettled(files.map(extractText))
  const texts: string[] = []
  for (let i = 0; i < extractions.length; i++) {
    const result = extractions[i]
    if (result.status === 'fulfilled') {
      texts.push(`[File: ${files[i].name}]\n${result.value}`)
    }
  }
  if (!texts.length) {
    return NextResponse.json({ error: 'Could not extract content from any of the uploaded files' }, { status: 422 })
  }
  const combinedContent = texts.join('\n\n---\n\n').slice(0, 20000)

  // Save capture
  const captureResult = await createCapture({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    source: 'structured',
    rawContent: combinedContent,
    structuredData: { filenames: files.map((f) => f.name), fileCount: files.length },
    isPrivate: false,
    tags: [],
  })
  if (!captureResult.ok) return NextResponse.json({ error: captureResult.error }, { status: 500 })
  const capture = captureResult.data

  const supabase = await createClient()

  // Resolve lens
  let resolvedLensId = lensId
  if (!resolvedLensId) {
    const { data: systemLens } = await supabase.from('lenses').select('id').is('workspace_id', null).limit(1).single()
    if (systemLens) resolvedLensId = systemLens.id
  }

  const { data: lens } = await supabase.from('lenses').select('id, system_prompt').eq('id', resolvedLensId ?? '').single()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, tone_notes, mental_models, philosophies, target_audiences, sample_content')
    .eq('workspace_id', session.workspaceId)
    .single()

  const systemPrompt = buildMultiDraftSystemPrompt({
    lensSystemPrompt: lens?.system_prompt ?? 'You are a world-class ghostwriter for thought leaders.',
    profileContext: {
      displayName: profile?.display_name ?? null,
      toneNotes: profile?.tone_notes ?? null,
      mentalModels: (profile?.mental_models as Array<{ name: string; description: string }>) ?? [],
      philosophies: (profile?.philosophies as Array<{ name: string; description: string }>) ?? [],
      targetAudiences: (profile?.target_audiences as string[]) ?? [],
      sampleContent: (profile?.sample_content as string[]) ?? [],
    },
  })

  const fileLabel = files.length === 1 ? files[0].name : `${files.length} files`
  const userMessage = `Source files: ${fileLabel}\n\nExtracted content:\n${combinedContent}`

  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      workspace_id: session.workspaceId,
      capture_id: capture.id,
      lens_id: resolvedLensId ?? '',
      profile_id: profile?.id ?? session.userId,
      status: 'generating',
      model: 'claude-sonnet-4-6',
      prompt_snapshot: systemPrompt,
    })
    .select()
    .single()

  if (genError || !generation) return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 })

  let drafts: Array<{ angle: string; body: string; hook: string; hashtags: string[] }> = []

  try {
    const aiResult = await callClaude({ systemPrompt, userMessage, model: 'claude-sonnet-4-6', maxTokens: 4096 })

    await supabase.from('generations').update({
      status: 'complete',
      raw_response: aiResult.content,
      duration_ms: aiResult.durationMs,
      token_count: aiResult.inputTokens + aiResult.outputTokens,
      completed_at: new Date().toISOString(),
    }).eq('id', generation.id)

    const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        drafts = parsed.slice(0, 3).map((d, i) => ({
          angle: d.angle ?? ANGLES[i] ?? `Draft ${i + 1}`,
          body: d.body ?? '',
          hook: d.hook ?? '',
          hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        }))
      }
    }
  } catch (err) {
    await supabase.from('generations').update({ status: 'failed', error_message: String(err) }).eq('id', generation.id)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  if (!drafts.length) return NextResponse.json({ error: 'No drafts generated' }, { status: 500 })

  const { data: outputs, error: outputError } = await supabase
    .from('outputs')
    .insert(drafts.map((d) => ({
      workspace_id: session.workspaceId,
      generation_id: generation.id,
      status: 'draft' as const,
      title: d.hook?.slice(0, 120) || d.angle,
      content: { body: d.body, hook: d.hook, hashtags: d.hashtags, angle: d.angle },
    })))
    .select('id, title, content')

  if (outputError || !outputs?.length) return NextResponse.json({ error: 'Failed to save drafts' }, { status: 500 })

  return NextResponse.json({
    capture_id: capture.id,
    file_label: fileLabel,
    drafts: outputs.map((o, i) => ({
      output_id: o.id,
      angle: drafts[i].angle,
      hook: drafts[i].hook,
      body: drafts[i].body,
      preview: drafts[i].body.slice(0, 300),
    })),
  })
}
