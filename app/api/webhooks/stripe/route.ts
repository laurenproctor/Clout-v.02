import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

const PLAN_FROM_PRICE: Record<string, string> = {
  // Map your Stripe price IDs to plan names when you create them
  // price_xxx: 'pro',
}

function planFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price?.id
  return PLAN_FROM_PRICE[priceId ?? ''] ?? 'free'
}

function statusFromSubscription(sub: Stripe.Subscription): string {
  const map: Record<string, string> = {
    active: 'active', trialing: 'trialing', past_due: 'past_due',
    canceled: 'canceled', paused: 'paused',
    incomplete: 'past_due', incomplete_expired: 'canceled', unpaid: 'past_due',
  }
  return map[sub.status] ?? 'active'
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      if (session.mode !== 'subscription') break
      const workspaceId = session.metadata?.workspace_id
      if (!workspaceId) break
      await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('workspace_id')
        .eq('stripe_customer_id', sub.customer as string)
        .single()
      if (!existing) break
      await supabase
        .from('subscriptions')
        .update({
          plan: planFromSubscription(sub),
          status: statusFromSubscription(sub),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', existing.workspace_id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('workspace_id')
        .eq('stripe_customer_id', sub.customer as string)
        .single()
      if (!existing) break
      await supabase
        .from('subscriptions')
        .update({ plan: 'free', status: 'canceled', updated_at: new Date().toISOString() })
        .eq('workspace_id', existing.workspace_id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('workspace_id')
        .eq('stripe_customer_id', invoice.customer as string)
        .single()
      if (!existing) break
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('workspace_id', existing.workspace_id)
      break
    }
  }

  return NextResponse.json({ ok: true })
}
