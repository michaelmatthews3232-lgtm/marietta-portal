import { NextRequest, NextResponse } from 'next/server'
import { stripe, SETUP_FEE_PRICE_ID } from '../../../lib/stripe'
import { getClientBySlug } from '../../../lib/db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json()
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app'

    // Reuse existing Stripe customer or create one
    let customerId: string = (record as Record<string, unknown>).stripe_customer_id as string
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    record.email        || undefined,
        name:     record.business_name || undefined,
        metadata: { slug },
      })
      customerId = customer.id
      await fetch(`${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ stripe_customer_id: customerId }),
      })
    }

    // mode: 'payment' lets us show both line items clearly ($100 setup + $50 first month = $150 today)
    // The webhook will create the $50/month subscription after this payment succeeds
    const session = await stripe.checkout.sessions.create({
      mode:     'payment',
      customer: customerId,
      line_items: [
        { price: SETUP_FEE_PRICE_ID, quantity: 1 },
        {
          price_data: {
            currency:     'usd',
            product_data: { name: 'Monthly Website Maintenance — Month 1' },
            unit_amount:  5000,
          },
          quantity: 1,
        },
      ],
      metadata: { slug, firstPayment: 'true' },
      payment_intent_data: { metadata: { slug, firstPayment: 'true' } },
      success_url: `${portalUrl}/admin?payment=success&client=${slug}`,
      cancel_url:  `${portalUrl}/admin`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
