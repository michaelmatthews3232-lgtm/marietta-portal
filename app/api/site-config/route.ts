import { NextRequest, NextResponse } from 'next/server'
import { getClientBySlug, getClientByEmail, getAllClients } from '../../../lib/db'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'michael.matthews3232@gmail.com')
  .split(',').map(e => e.trim().toLowerCase())

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const slug  = req.nextUrl.searchParams.get('slug')
  const admin = req.nextUrl.searchParams.get('admin')

  if (admin === 'true') {
    const all = await getAllClients()
    return NextResponse.json(all.map(c => ({
      name:        c.business_name,
      slug:        c.slug,
      netlifyUrl:  c.netlify_url,
      address:     c.address,
      phone:       c.phone || '',
      email:       c.email || '',
      onboardedAt: c.onboarded_at,
      status:      c.status
    })))
  }

  if (slug) {
    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    return NextResponse.json(formatRecord(record))
  }

  if (email) {
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json({ isAdmin: true })
    }
    const record = await getClientByEmail(email)
    if (!record) return NextResponse.json({ error: 'No site found for this email' }, { status: 404 })
    return NextResponse.json(formatRecord(record))
  }

  return NextResponse.json({ error: 'Provide email or slug' }, { status: 400 })
}

function formatRecord(record: ReturnType<typeof Object.assign>) {
  return {
    name:       record.business_name,
    phone:      record.phone || '',
    email:      record.email || '',
    address:    record.address || '',
    hours:      record.hours || [],
    slug:       record.slug,
    netlifyUrl: record.netlify_url
  }
}
