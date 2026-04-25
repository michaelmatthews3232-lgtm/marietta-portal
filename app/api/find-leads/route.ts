import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location') || 'Marietta, GA'
  const type     = req.nextUrl.searchParams.get('type')     || 'hair_care'

  // Geocode location string → lat/lng
  const geoRes  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${API_KEY}`)
  const geoData = await geoRes.json()
  const loc = geoData.results?.[0]?.geometry?.location
  if (!loc) return NextResponse.json({ error: `Could not geocode: ${location}` }, { status: 400 })

  // Collect up to 3 pages of nearby results (up to 60 places)
  const allPlaces: Record<string, unknown>[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 3; page++) {
    const url = pageToken
      ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${API_KEY}&pagetoken=${pageToken}`
      : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${API_KEY}&location=${loc.lat},${loc.lng}&radius=16000&type=${type}`

    const res  = await fetch(url)
    const data = await res.json()

    for (const place of (data.results || [])) {
      if (place.business_status === 'OPERATIONAL') allPlaces.push(place)
    }

    pageToken = data.next_page_token
    if (!pageToken) break

    // Google requires a short pause before the next_page_token becomes valid
    await new Promise(r => setTimeout(r, 2000))
  }

  // Fetch details for all places in parallel batches of 10
  const leads = []
  for (let i = 0; i < allPlaces.length; i += 10) {
    const batch = allPlaces.slice(i, i + 10)
    const results = await Promise.all(batch.map(async place => {
      try {
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${API_KEY}&place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,types,url,editorial_summary,reviews`
        const detailRes  = await fetch(detailUrl)
        const detailData = await detailRes.json()
        if (detailData.status !== 'OK') return null

        const d = detailData.result
        if (d.website) return null // skip businesses that already have a website

        const rawReviews: Array<{author_name?: string; rating?: number; text?: string; relative_time_description?: string}> = d.reviews || []
        const reviews = rawReviews
          .filter(r => r.text?.trim())
          .slice(0, 5)
          .map(r => ({
            author: r.author_name || 'Google Reviewer',
            text:   r.text || '',
            stars:  '★'.repeat(Math.round(r.rating || 5)).padEnd(5, '☆'),
            time:   r.relative_time_description || '',
          }))

        return {
          placeId:     place.place_id,
          name:        d.name,
          address:     d.formatted_address,
          phone:       d.formatted_phone_number  || null,
          rating:      d.rating                  || null,
          reviewCount: d.user_ratings_total      || 0,
          types:       d.types                   || [],
          hours:       d.opening_hours?.weekday_text || [],
          googleUrl:   d.url,
          summary:     d.editorial_summary?.overview || null,
          category:    type,
          reviews,
        }
      } catch {
        return null
      }
    }))

    leads.push(...results.filter(Boolean))
  }

  return NextResponse.json(leads)
}
