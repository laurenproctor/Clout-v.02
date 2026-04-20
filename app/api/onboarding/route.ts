import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createWorkspaceForUser, updateProfile } from '@/lib/domain/workspace'
import { updateOnboardingStep } from '@/lib/domain/onboarding'

// POST /api/onboarding
// Creates workspace + updates profile on onboarding completion.
// Called step-by-step from the onboarding form.
// Body: { step: 'workspace' | 'profile' | 'privacy' | 'identity' | 'purpose' | 'beliefs' | 'channels' | 'audience', data: {...} }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { step, data } = body

  if (step === 'workspace') {
    if (!data?.name?.trim()) {
      return NextResponse.json({ error: 'Workspace name required' }, { status: 400 })
    }
    const result = await createWorkspaceForUser({
      userId: session.userId,
      name: data.name.trim(),
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json(result.data, { status: 201 })
  }

  if (step === 'profile') {
    const result = await updateProfile({
      workspaceId: session.workspaceId,
      displayName: data?.display_name ?? undefined,
      bio: data?.bio ?? undefined,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'privacy') {
    const result = await updateProfile({
      workspaceId: session.workspaceId,
      privateFeedOperatorVisible: data?.operator_visible ?? false,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'identity') {
    if (!data?.display_name?.trim()) {
      return NextResponse.json({ error: 'Display name required' }, { status: 400 })
    }
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step: 'identity',
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'purpose') {
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step: 'purpose',
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'beliefs') {
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step: 'beliefs',
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'channels') {
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step: 'channels',
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (step === 'audience') {
    const result = await updateOnboardingStep({
      workspaceId: session.workspaceId,
      step: 'audience',
      data,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
}
