import { NextRequest, NextResponse } from 'next/server'
import { getClientBySlug } from '../../../lib/db'
import { renderSiteHtml, getTemplateCss, buildTemplateData } from '../../../lib/builder'
import { deployToNetlify } from '../../../lib/netlify'

const API_KEY      = process.env.GOOGLE_PLACES_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json()
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const placeId = (record.lead_data as Record<string, unknown>)?.placeId as string
    if (!placeId) return NextResponse.json({ error: 'No Google Place ID stored for this client' }, { status: 400 })

    // Fetch fresh data from Google Places
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?key=${API_KEY}&place_id=${placeId}&fields=name,formatted_phone_number,opening_hours,rating,user_ratings_total,reviews`
    )
    const detailData = await detailRes.json()
    if (detailData.status !== 'OK') {
      return NextResponse.json({ error: `Google Places error: ${detailData.status}` }, { status: 502 })
    }
    const d = detailData.result

    // Process reviews
    type RawReview = { author_name?: string; rating?: number; text?: string; relative_time_description?: string }
    const reviews = ((d.reviews || []) as RawReview[])
      .filter(r => r.text?.trim())
      .slice(0, 5)
      .map(r => ({
        author: r.author_name || 'Google Reviewer',
        text:   r.text || '',
        stars:  '★'.repeat(Math.min(5, Math.round(r.rating || 5))).padEnd(5, '☆'),
        time:   r.relative_time_description || '',
      }))

    // Merge into existing lead_data
    const updatedLead = {
      ...(record.lead_data as Record<string, unknown>),
      phone:       d.formatted_phone_number                    || (record.lead_data as Record<string, unknown>).phone,
      hours:       d.opening_hours?.weekday_text               || (record.lead_data as Record<string, unknown>).hours,
      rating:      d.rating                                    ?? (record.lead_data as Record<string, unknown>).rating,
      reviewCount: d.user_ratings_total                        ?? (record.lead_data as Record<string, unknown>).reviewCount,
      reviews,
    }

    // Rebuild and redeploy
    const templateData = buildTemplateData(record.ai_content, updatedLead)
    const html = renderSiteHtml(record.template_name, templateData)
    const css  = getTemplateCss(record.template_name)

    await deployToNetlify(record.netlify_site_id, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css, 'utf8'),
    })

    // Update DB
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          lead_data:   updatedLead,
          phone:       d.formatted_phone_number || (record.lead_data as Record<string, unknown>).phone || null,
          hours:       d.opening_hours?.weekday_text || (record.lead_data as Record<string, unknown>).hours || [],
        }),
      }
    )
    if (!dbRes.ok) throw new Error(`DB update failed: ${await dbRes.text()}`)

    return NextResponse.json({
      success: true,
      refreshed: {
        reviews:     reviews.length,
        rating:      d.rating,
        reviewCount: d.user_ratings_total,
        phone:       d.formatted_phone_number || null,
        hours:       (d.opening_hours?.weekday_text?.length || 0) > 0,
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
