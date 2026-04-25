import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getClientBySlug, updateClientContent } from '../../../lib/db'
import { renderSiteHtml, getTemplateCss } from '../../../lib/builder'
import { deployToNetlify } from '../../../lib/netlify'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { slug, prompt } = await req.json()
    if (!slug || !prompt?.trim()) return NextResponse.json({ error: 'Missing slug or prompt' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const currentContent = record.ai_content
    const currentLead    = record.lead_data

    // Ask Claude what changed
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You manage a small business website. Interpret the owner's plain-English request and return ONLY the fields that need to change as valid JSON. No explanation, no markdown.`,
      messages: [{
        role: 'user',
        content: `Business: ${currentLead.name} (${currentLead.category})

Current content:
${JSON.stringify(currentContent, null, 2)}

Current info: phone=${currentLead.phone}, email=${currentLead.email}, hours=${JSON.stringify(currentLead.hours)}

Owner's request: "${prompt}"

Return JSON with only changed fields. For services or hours arrays, return the full updated array.`
      }]
    })

    const block = message.content[0]
    const raw = (block.type === 'text' ? block.text : '').trim()
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const updates = JSON.parse(cleaned)

    // Split into content vs lead fields
    const leadFields = ['phone', 'email', 'hours', 'address']
    const contentUpdates: Record<string, unknown> = {}
    const leadUpdates: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      if (leadFields.includes(key)) leadUpdates[key] = value
      else contentUpdates[key] = value
    }

    const updatedContent = { ...currentContent, ...contentUpdates }
    const updatedLead    = { ...currentLead, ...leadUpdates }

    // Rebuild and redeploy
    const templateData = buildTemplateData(updatedContent, updatedLead)
    const html = renderSiteHtml(record.template_name, templateData)
    const css  = getTemplateCss(record.template_name)

    const url = await deployToNetlify(record.netlify_site_id, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css, 'utf8'),
    })

    await updateClientContent(slug, updatedContent, updatedLead)

    return NextResponse.json({
      success: true,
      url,
      changes: updates,
      summary: buildSummary(updates)
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('ai-update error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildTemplateData(aiContent: Record<string, unknown>, lead: Record<string, unknown>) {
  return {
    ...aiContent,
    name:           lead.name,
    address:        lead.address,
    phone:          lead.phone || '',
    email:          lead.email || '',
    hours:          lead.hours || [],
    rating:         lead.rating || null,
    reviewCount:    lead.reviewCount || 0,
    socialProfiles: lead.socialProfiles || {},
    yelpUrl:        lead.yelpUrl || null,
    year:           new Date().getFullYear(),
    portalUrl:      process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app',
    slug:           lead.slug
  }
}

function buildSummary(updates: Record<string, unknown>): string {
  const parts: string[] = []
  if (updates.services)    parts.push('services list')
  if (updates.hours)       parts.push('business hours')
  if (updates.phone)       parts.push('phone number')
  if (updates.email)       parts.push('email address')
  if (updates.tagline)     parts.push('tagline')
  if (updates.aboutBody)   parts.push('about section')
  if (updates.heroHeadline || updates.heroSubtext) parts.push('hero section')
  return parts.length > 0 ? `Updated: ${parts.join(', ')}` : 'Site updated'
}
