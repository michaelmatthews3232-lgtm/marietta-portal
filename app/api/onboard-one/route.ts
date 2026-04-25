import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { renderSiteHtml, getTemplateCss } from '../../../lib/builder'
import { deployToNetlify } from '../../../lib/netlify'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEMPLATE_MAP: Record<string, string> = {
  restaurant: 'restaurant', food: 'restaurant', cafe: 'restaurant',
  bar: 'restaurant', bakery: 'restaurant', meal_takeaway: 'restaurant',
  hair_care: 'salon', beauty_salon: 'salon', nail_salon: 'salon', spa: 'salon',
  plumber: 'trades', electrician: 'trades', painter: 'trades',
  general_contractor: 'trades', roofing_contractor: 'trades',
}

const CATEGORY_HERO_IMAGES: Record<string, string> = {
  hair_care:          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80',
  beauty_salon:       'https://images.unsplash.com/photo-1487412840181-b228e1ad0c4b?w=1600&q=80',
  nail_salon:         'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&q=80',
  spa:                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&q=80',
  restaurant:         'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
  food:               'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
  cafe:               'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80',
  bakery:             'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1600&q=80',
  bar:                'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1600&q=80',
  meal_takeaway:      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
  plumber:            'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=1600&q=80',
  electrician:        'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1600&q=80',
  general_contractor: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
  painter:            'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1600&q=80',
  roofing_contractor: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getTemplate(types: string[]) {
  for (const t of types) {
    if (TEMPLATE_MAP[t.toLowerCase()]) return TEMPLATE_MAP[t.toLowerCase()]
  }
  return 'restaurant'
}

function getHeroImage(types: string[]): string {
  for (const t of types) {
    const img = CATEGORY_HERO_IMAGES[t.toLowerCase()]
    if (img) return img
  }
  return CATEGORY_HERO_IMAGES.restaurant
}

export async function POST(req: NextRequest) {
  try {
    const lead = await req.json()
    const slug = slugify(lead.name)

    // Duplicate check
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}&select=slug`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const existing = await checkRes.json()
    if (existing.length > 0) return NextResponse.json({ error: 'Site already exists for this business' }, { status: 409 })

    const cityName = lead.address?.split(',').slice(1, 2).join('').trim() || 'the local area'
    const ratingNote = lead.rating >= 4.5
      ? `They have an outstanding ${lead.rating}-star rating from ${lead.reviewCount} Google reviews — weave their strong reputation into the copy naturally.`
      : lead.rating >= 4
      ? `They have a solid ${lead.rating}-star rating (${lead.reviewCount} reviews).`
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a professional web copywriter for local small businesses. You write copy that feels personal, specific, and local — never generic. Return ONLY valid JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Generate compelling, specific website copy for this local business. The copy must feel written FOR this specific business — not a template. Reference the city, use industry-specific language, give this business a distinct voice.

Avoid filler phrases like "committed to excellence", "quality you can trust", or "serving the community". Write copy that makes a real customer want to visit or call.

Return a JSON object with exactly these fields:
{
  "tagline": "punchy tagline under 8 words — specific to their type and city",
  "heroHeadline": "welcoming headline that speaks to their ideal customer — not generic",
  "heroSubtext": "2 sentences that paint a picture of the experience — sensory details, no generic promises",
  "aboutTitle": "About section title",
  "aboutBody": "3-4 sentences — reference ${cityName}, their specialty, what sets them apart from chains",
  "servicesTitle": "Services section title",
  "services": [{ "title": "service name", "description": "one specific sentence — mention technique, outcome, or a detail showing real expertise" }],
  "ctaHeadline": "action-oriented headline with mild urgency",
  "ctaSubtext": "one sentence with a specific benefit or reason to act",
  "metaTitle": "SEO title under 60 chars — include business name and city",
  "metaDescription": "SEO description under 155 chars — include category and city keywords"
}

Services: 4-6 items realistic for this exact business type. Each description should include a specific detail showing real industry knowledge.

Business: ${lead.name}
Category: ${lead.category}
City: ${cityName}
Full Address: ${lead.address}
Phone: ${lead.phone || 'not provided'}
Google Rating: ${lead.rating || 'N/A'} stars (${lead.reviewCount || 0} reviews)
${ratingNote}
Google Summary: ${lead.summary || 'none provided'}`
      }]
    })

    const block = message.content[0]
    const raw = (block.type === 'text' ? block.text : '').trim()
    const aiContent = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))

    const allTypes = lead.types?.length ? lead.types : [lead.category]
    const templateName = getTemplate(allTypes)
    const heroImageUrl = getHeroImage(allTypes)

    const templateData = {
      ...aiContent,
      name: lead.name, address: lead.address,
      phone: lead.phone || '', email: lead.email || '',
      hours: lead.hours || [], rating: lead.rating || null,
      reviewCount: lead.reviewCount || 0, socialProfiles: {},
      yelpUrl: null, year: new Date().getFullYear(),
      portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app',
      slug,
      heroImageUrl,
    }
    const html = renderSiteHtml(templateName, templateData)
    const css  = getTemplateCss(templateName)

    // Create Netlify site
    const siteName = `mw-${slug}`.slice(0, 63).replace(/[^a-z0-9-]/g, '-')
    const netlifyRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: siteName })
    })
    if (!netlifyRes.ok) throw new Error(`Netlify create failed: ${await netlifyRes.text()}`)
    const netlifyData = await netlifyRes.json()
    const siteId     = netlifyData.id
    const netlifyUrl = `https://${netlifyData.subdomain}.netlify.app`

    const deployedUrl = await deployToNetlify(siteId, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css,  'utf8'),
    })

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        slug, business_name: lead.name,
        email: lead.email || null, phone: lead.phone || null,
        address: lead.address || null, hours: lead.hours || [],
        netlify_site_id: siteId,
        netlify_url: deployedUrl || netlifyUrl,
        template_name: templateName,
        ai_content: aiContent, lead_data: lead,
        status: 'pending',
        onboarded_at: new Date().toISOString(),
      })
    })
    if (!dbRes.ok) throw new Error(`DB save failed: ${await dbRes.text()}`)

    return NextResponse.json({ success: true, slug, url: deployedUrl || netlifyUrl, business: lead.name })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
