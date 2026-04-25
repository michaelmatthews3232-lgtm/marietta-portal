import { NextRequest, NextResponse } from 'next/server'
import { stripe, SETUP_FEE_PRICE_ID, MONTHLY_PRICE_ID } from '../../../lib/stripe'
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

    // Reuse existing Stripe customer or create a new one
    let customerId: string = (record as Record<string, unknown>).stripe_customer_id as string
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    record.email    || undefined,
        name:     record.business_name || undefined,
        metadata: { slug },
      })
      customerId = customer.id

      // Save customer ID to DB immediately
      await fetch(`${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ stripe_customer_id: customerId }),
      })
    }

    // Attach setup fee as a pending invoice item — Stripe will include it in the first subscription invoice
    await stripe.invoiceItems.create({
      customer: customerId,
      price:    SETUP_FEE_PRICE_ID,
    })

    // Create subscription checkout — first invoice will be $150 ($100 setup + $50 month), then $50/mo
    const session = await stripe.checkout.sessions.create({
      mode:     'subscription',
      customer: customerId,
      line_items: [
        { price: MONTHLY_PRICE_ID, quantity: 1 },
      ],
      subscription_data: { metadata: { slug } },
      metadata: { slug },
      success_url: `${portalUrl}/admin?payment=success&client=${slug}`,
      cancel_url:  `${portalUrl}/admin`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
