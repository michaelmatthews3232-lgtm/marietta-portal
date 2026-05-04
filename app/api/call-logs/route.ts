/**
 * GET  /api/call-logs?slug=X  — fetch call history for a lead
 * POST /api/call-logs          — log a call, update client stats
 */

import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function headers(extra?: Record<string, string>) {
  return {
    apikey:        SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/call_logs?slug=eq.${encodeURIComponent(slug)}&order=called_at.desc&limit=20`,
    { headers: headers() }
  )
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  try {
    const { slug, callerEmail, outcome, notes, callbackDate } = await req.json()
    if (!slug || !callerEmail || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get client id
    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}&select=id,call_count,status`,
      { headers: headers() }
    )
    const clients = await clientRes.json()
    if (!clients.length) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    const client = clients[0]

    // Insert call log
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        client_id:     client.id,
        slug,
        caller_email:  callerEmail,
        outcome,
        notes:         notes || null,
        callback_date: callbackDate || null,
      }),
    })
    if (!logRes.ok) throw new Error(await logRes.text())

    // Build client patch
    const patch: Record<string, unknown> = {
      call_count:    (client.call_count || 0) + 1,
      last_called_at: new Date().toISOString(),
    }
    if (notes)                          patch.caller_notes       = notes
    if (callbackDate)                   patch.next_callback_date = callbackDate
    if (outcome === 'interested')       patch.caller_interested  = true
    if (outcome === 'not_interested')   patch.caller_interested  = false
    if (outcome === 'not_interested')   patch.status             = 'not_interested'
    if (outcome !== 'not_interested' && client.status === 'pending') {
      patch.status = 'contacted'
    }

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`,
      { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) }
    )
    if (!patchRes.ok) throw new Error(await patchRes.text())

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
