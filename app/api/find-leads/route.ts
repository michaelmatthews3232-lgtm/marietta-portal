import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location') || 'Marietta, GA'
  const type     = req.nextUrl.searchParams.get('type')     || 'hair_care'

  // Geocode location string → lat/lng
  const geoRes  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${API_KEY}`)
  const geoData = await geoRes.json()
  const loc = geoData.results?.[0]?.geometry?.location
  if (!loc) return NextResponse.json({ error: `Could not geocode: ${location}` }, { status: 400 })

  // Nearby search
  const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${API_KEY}&location=${loc.lat},${loc.lng}&radius=16000&type=${type}`
  const searchRes  = await fetch(searchUrl)
  const searchData = await searchRes.json()

  const leads = []
  for (const place of (searchData.results || [])) {
    if (place.business_status !== 'OPERATIONAL') continue

    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${API_KEY}&place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,types,url,editorial_summary`
    const detailRes  = await fetch(detailUrl)
    const detailData = await detailRes.json()
    if (detailData.status !== 'OK') continue

    const d = detailData.result
    if (d.website) continue // skip businesses that already have a website

    leads.push({
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
    })
  }

  return NextResponse.json(leads)
}
