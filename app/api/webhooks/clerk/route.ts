import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/service'

interface ClerkUserEventData {
  id: string
  email_addresses: Array<{ email_address: string; id: string }>
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
  public_metadata: Record<string, unknown>
}

function getPrimaryEmail(data: ClerkUserEventData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
}

function getFullName(data: ClerkUserEventData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verify Svix signature
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: { type: string; data: ClerkUserEventData }
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserEventData }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { type, data } = event

  if (type === 'user.created' || type === 'user.updated') {
    const email = getPrimaryEmail(data)
    const fullName = getFullName(data)
    const operatorRole = (data.public_metadata?.operator_role as string) ?? null

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: data.id,
          email,
          full_name: fullName,
          avatar_url: data.image_url ?? null,
          operator_role: operatorRole as 'super_admin' | 'agency_operator' | null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_id' }
      )

    if (error) {
      console.error('Failed to upsert user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Dispatch welcome email only on creation
    if (type === 'user.created') {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', data.id)
        .single()

      if (user) {
        const { dispatchEmail } = await import('@/lib/trigger/jobs/dispatch-email')
        await dispatchEmail.trigger({
          type: 'welcome',
          userId: user.id,
          email,
          displayName: fullName ?? email.split('@')[0],
        })
      }
    }
  }

  if (type === 'user.deleted') {
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('clerk_id', data.id)

    if (error) {
      console.error('Failed to soft-delete user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
