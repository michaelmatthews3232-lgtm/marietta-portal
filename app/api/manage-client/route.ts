/**
 * PATCH /api/manage-client
 * Handles: status change, client email update, domain assignment
 */

import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function dbHeaders(extra?: Record<string, string>) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
    ...extra,
  }
}

async function dbPatch(slug: string, body: Record<string, unknown>) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`,
    { method: 'PATCH', headers: dbHeaders(), body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`)
}

async function dbGet(slug: string, select: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}&select=${select}`,
    { headers: dbHeaders() }
  )
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`)
  const rows = await res.json()
  return rows[0] ?? null
}

export async function PATCH(req: NextRequest) {
  try {
    const { slug, action, value } = await req.json()
    if (!slug || !action) return NextResponse.json({ error: 'Missing slug or action' }, { status: 400 })

    switch (action) {

      case 'set_status': {
        await dbPatch(slug, { status: value })
        return NextResponse.json({ success: true })
      }

      case 'set_email': {
        const record = await dbGet(slug, 'lead_data')
        const updatedLead = { ...(record?.lead_data || {}), email: value }
        await dbPatch(slug, { email: value, lead_data: updatedLead })
        return NextResponse.json({ success: true })
      }

      case 'set_domain': {
        const record = await dbGet(slug, 'netlify_site_id')
        if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

        const netlifyRes = await fetch(
          `https://api.netlify.com/api/v1/sites/${record.netlify_site_id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ custom_domain: value })
          }
        )
        if (!netlifyRes.ok) {
          const txt = await netlifyRes.text()
          throw new Error(`Netlify domain error: ${txt}`)
        }

        const netlifyData = await netlifyRes.json()
        const finalUrl = `https://${value}`
        await dbPatch(slug, { netlify_url: finalUrl })

        return NextResponse.json({ success: true, url: finalUrl, netlify: netlifyData })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
