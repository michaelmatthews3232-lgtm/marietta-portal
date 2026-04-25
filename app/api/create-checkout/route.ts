import { NextRequest, NextResponse } from 'next/server'
import { stripe, SETUP_FEE_PRICE_ID, MONTHLY_PRICE_ID } from '../../../lib/stripe'
import { getClientBySlug } from '../../../lib/db'

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json()
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: record.email || undefined,
      line_items: [
        { price: SETUP_FEE_PRICE_ID, quantity: 1 },
        { price: MONTHLY_PRICE_ID,   quantity: 1 },
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
