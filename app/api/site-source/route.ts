import { NextRequest, NextResponse } from 'next/server'
import { getClientBySlug } from '../../../lib/db'
import { renderSiteHtml, getTemplateCss, buildTemplateData } from '../../../lib/builder'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const templateData = buildTemplateData(record.ai_content, record.lead_data)
    const html = renderSiteHtml(record.template_name, templateData)
    const css  = getTemplateCss(record.template_name)

    return NextResponse.json({ html, css })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
