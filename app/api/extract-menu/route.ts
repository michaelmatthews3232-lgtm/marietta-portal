import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getClientBySlug } from '../../../lib/db'
import { renderSiteHtml, getTemplateCss, buildTemplateData, renderMenuHtml, MenuCategory } from '../../../lib/builder'
import { deployToNetlify } from '../../../lib/netlify'

export const maxDuration = 60

const client = new Anthropic()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { slug, imageBase64, mimeType = 'image/jpeg' } = await req.json()
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    if (!imageBase64) return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 })

    const record = await getClientBySlug(slug)
    if (!record) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Extract menu from image using Claude Vision
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 },
          },
          {
            type: 'text',
            text: `Extract the menu from this image. Return ONLY a JSON array of categories, no explanation, no markdown fences. Format:
[
  {
    "name": "Category Name",
    "items": [
      { "name": "Item Name", "description": "Brief description or empty string", "price": "$12" }
    ]
  }
]
Include all visible menu items. Use empty string for description if not shown. Omit price field if not visible.`,
          },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    let categories: MenuCategory[]
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      categories = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Could not parse menu from image', raw: text }, { status: 422 })
    }

    const menuHtml = renderMenuHtml(categories)

    // Rebuild and redeploy with menu
    const updatedAiContent = { ...(record.ai_content as Record<string, unknown> || {}), menuHtml }
    const templateData = buildTemplateData(updatedAiContent, record.lead_data as Record<string, unknown> || {})
    const html = renderSiteHtml(record.template_name, templateData)
    const css  = getTemplateCss(record.template_name)

    await deployToNetlify(record.netlify_site_id, {
      '/index.html': Buffer.from(html, 'utf8'),
      '/style.css':  Buffer.from(css, 'utf8'),
    })

    // Save to DB
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ai_content: updatedAiContent }),
      }
    )
    if (!dbRes.ok) throw new Error(`DB update failed: ${await dbRes.text()}`)

    return NextResponse.json({ success: true, categories: categories.length, items: categories.reduce((s, c) => s + c.items.length, 0) })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
