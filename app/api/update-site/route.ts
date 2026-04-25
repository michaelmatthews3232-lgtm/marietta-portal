import { NextRequest, NextResponse } from 'next/server'
import { getClientBySlug, updateClientContent } from '../../../lib/db'
import { renderSiteHtml, getTemplateCss } from '../../../lib/builder'
import { deployToNetlify } from '../../../lib/netlify'

export async function POST(req: NextRequest) {
  try {
    const { slug, updates } = await req.json()
    if (!slug || !updates) return NextResponse.json({ error: 'Missing slug or updates' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const updatedLead = { ...record.lead_data, ...updates }
    const templateData = buildTemplateData(record.ai_content, updatedLead)

    const html = renderSiteHtml(record.template_name, templateData)
    const css  = getTemplateCss(record.template_name)

    const url = await deployToNetlify(record.netlify_site_id, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css, 'utf8'),
    })

    await updateClientContent(slug, record.ai_content, updatedLead)

    return NextResponse.json({ success: true, url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
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
