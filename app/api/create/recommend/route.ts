import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { recommendContentRoute } from '@/lib/create/recommend'
import { saveCreateRecommendation } from '@/lib/create/recommendation'
import {
  type RecommendContentInput,
  type StoredCreateRecommendation,
  type UniversalInputType,
  isRecommendedFormat,
} from '@/lib/create/recommendTypes'

export const maxDuration = 60

const INPUT_TYPES: UniversalInputType[] = ['topic', 'write', 'paste', 'link', 'voice', 'upload']
const MAX_INPUT_CHARS = 20_000

export async function POST(req: NextRequest) {
  // Auth: workspaceId comes from the authenticated session — we never trust a
  // client-supplied workspace. (Matches every other route in this app.)
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Schema validation.
  const inputType = body.inputType
  if (typeof inputType !== 'string' || !INPUT_TYPES.includes(inputType as UniversalInputType)) {
    return NextResponse.json({ error: 'inputType is invalid' }, { status: 400 })
  }
  const rawInput = body.rawInput
  if (typeof rawInput !== 'string' || rawInput.trim().length === 0) {
    return NextResponse.json({ error: 'rawInput is required' }, { status: 400 })
  }
  if (rawInput.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: 'rawInput is too long' }, { status: 400 })
  }

  const startingPointRaw = body.startingPoint
  const startingPoint =
    startingPointRaw === 'auto' || isRecommendedFormat(startingPointRaw)
      ? (startingPointRaw as RecommendContentInput['startingPoint'])
      : 'auto'

  const input: RecommendContentInput = {
    inputType: inputType as UniversalInputType,
    rawInput: rawInput,
    brandLensId: typeof body.brandLensId === 'string' ? body.brandLensId : null,
    angle: typeof body.angle === 'string' ? body.angle : null,
    goal: typeof body.goal === 'string' ? body.goal : null,
    startingPoint,
    captureId: typeof body.captureId === 'string' ? body.captureId : null,
  }

  const result = await recommendContentRoute(input)

  // Persist the recommendation against the brief Capture so it survives routing
  // into a seeded creator and can be stamped onto the eventual Output.
  if (input.captureId) {
    const stored: StoredCreateRecommendation = {
      ...result,
      brandLensId: input.brandLensId ?? null,
      angle: input.angle ?? null,
      goal: input.goal ?? null,
      startingPoint: input.startingPoint ?? 'auto',
      createdAt: new Date().toISOString(),
    }
    const saved = await saveCreateRecommendation({
      captureId: input.captureId,
      workspaceId: session.workspaceId,
      recommendation: stored,
    })
    if (!saved.ok) {
      // Non-fatal: still return the recommendation so the UI can proceed.
      console.warn('[create/recommend] failed to persist recommendation:', saved.error)
    }
  }

  return NextResponse.json({ ...result, captureId: input.captureId }, { status: 200 })
}
