import { NextRequest, NextResponse } from 'next/server'
import { stripe, WEBHOOK_SECRET, MONTHLY_PRICE_ID } from '../../../lib/stripe'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function dbPatch(slug: string, body: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') || ''

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // First payment completed ($100 setup + $50 month 1)
  // Auto-create the $50/month subscription starting in 30 days
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const slug    = session.metadata?.slug
    if (!slug) return NextResponse.json({ ok: true })

    if (session.metadata?.firstPayment === 'true' && session.customer) {
      // Create recurring subscription — trial_period_days: 30 so no charge until month 2
      const sub = await stripe.subscriptions.create({
        customer:           session.customer as string,
        items:              [{ price: MONTHLY_PRICE_ID }],
        trial_period_days:  30,
        metadata:           { slug },
      })

      await dbPatch(slug, {
        status:                 'paid',
        stripe_customer_id:     session.customer as string,
        stripe_subscription_id: sub.id,
      })
    } else if (session.subscription) {
      // Subscription checkout fallback
      await dbPatch(slug, {
        status:                 'paid',
        stripe_customer_id:     session.customer     as string || null,
        stripe_subscription_id: session.subscription as string || null,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub  = event.data.object
    const slug = sub.metadata?.slug
    if (slug) {
      await dbPatch(slug, { stripe_subscription_id: null })
    }
  }

  return NextResponse.json({ ok: true })
}
