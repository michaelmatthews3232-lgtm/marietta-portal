import { NextRequest, NextResponse } from 'next/server'
import { getClientBySlug } from '../../../lib/db'
import { deployToNetlify } from '../../../lib/netlify'

export async function POST(req: NextRequest) {
  try {
    const { slug, html, css } = await req.json()
    if (!slug || !html?.trim()) return NextResponse.json({ error: 'Missing slug or html' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const url = await deployToNetlify(record.netlify_site_id, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css || '', 'utf8'),
    })

    return NextResponse.json({ success: true, url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
