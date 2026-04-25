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

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getTemplate(types: string[]) {
  for (const t of types) {
    if (TEMPLATE_MAP[t.toLowerCase()]) return TEMPLATE_MAP[t.toLowerCase()]
  }
  return 'restaurant'
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

    // Claude content generation
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a professional web copywriter for small local businesses. Return ONLY valid JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Generate website content for this business. Return a JSON object with exactly these fields:
{
  "tagline": "short punchy tagline under 10 words",
  "heroHeadline": "welcoming headline specific to their category",
  "heroSubtext": "2 sentences describing what makes this business worth visiting",
  "aboutTitle": "About Us title",
  "aboutBody": "3-4 sentence paragraph about the business",
  "servicesTitle": "Services section title",
  "services": [{ "title": "service name", "description": "one sentence" }],
  "ctaHeadline": "call-to-action headline",
  "ctaSubtext": "one sentence encouraging contact",
  "metaTitle": "SEO page title under 60 chars",
  "metaDescription": "SEO meta description under 155 chars"
}
Services: 4-6 items realistic for this category.

Business: ${lead.name}
Category: ${lead.category}
Address: ${lead.address}
Phone: ${lead.phone || 'not provided'}
Rating: ${lead.rating || 'unknown'} (${lead.reviewCount || 0} reviews)
Summary: ${lead.summary || 'none'}`
      }]
    })

    const block = message.content[0]
    const raw = (block.type === 'text' ? block.text : '').trim()
    const aiContent = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))

    // Build template
    const templateName = getTemplate(lead.types || [lead.category])
    const templateData = {
      ...aiContent,
      name: lead.name, address: lead.address,
      phone: lead.phone || '', email: lead.email || '',
      hours: lead.hours || [], rating: lead.rating || null,
      reviewCount: lead.reviewCount || 0, socialProfiles: {},
      yelpUrl: null, year: new Date().getFullYear(),
      portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app',
      slug,
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

    // Deploy
    const deployedUrl = await deployToNetlify(siteId, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css,  'utf8'),
    })

    // Save to Supabase
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
