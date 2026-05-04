/**
 * GET /api/caller-data
 * Returns all callable leads with call-tracking fields.
 * Accessible to CALLER_EMAILS and ADMIN_EMAILS.
 */

import { NextResponse } from 'next/server'

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!

function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
}

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=*&order=onboarded_at.desc`,
    { headers: headers(), cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })

  const rows = await res.json()

  const leads = rows
    .filter((c: Record<string, unknown>) => !['paid', 'active'].includes(c.status as string))
    .map((c: Record<string, unknown>) => {
      const leadData = (c.lead_data as Record<string, unknown>) || {}
      return {
        slug:              c.slug,
        name:              c.business_name,
        address:           c.address || '',
        phone:             c.phone   || '',
        netlifyUrl:        c.netlify_url || '',
        status:            c.status  || 'pending',
        templateName:      c.template_name || '',
        callCount:         (c.call_count    as number) || 0,
        lastCalledAt:      (c.last_called_at as string) || null,
        nextCallbackDate:  (c.next_callback_date as string) || null,
        callerNotes:       (c.caller_notes  as string) || null,
        callerInterested:  (c.caller_interested as boolean) || false,
        rating:            (leadData.rating as number) || null,
        reviewCount:       (leadData.reviewCount as number) || 0,
      }
    })

  return NextResponse.json(leads)
}
