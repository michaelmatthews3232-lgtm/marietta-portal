/**
 * Self-contained site builder for the portal.
 * Reads bundled templates from /templates/, renders HTML, returns it as a string.
 * Works on Vercel (no parent directory access needed).
 */

import fs from 'fs'
import path from 'path'

const TEMPLATE_MAP: Record<string, string> = {
  restaurant: 'restaurant', food: 'restaurant', cafe: 'restaurant',
  bar: 'restaurant', bakery: 'restaurant', meal_takeaway: 'restaurant',
  hair_care: 'salon', beauty_salon: 'salon', nail_salon: 'salon', spa: 'salon',
  florist: 'salon', gym: 'salon', fitness_center: 'salon',
  plumber: 'trades', electrician: 'trades', painter: 'trades',
  general_contractor: 'trades', roofing_contractor: 'trades',
  laundry: 'trades', dry_cleaning: 'trades', car_wash: 'trades',
  auto_repair: 'trades', locksmith: 'trades', moving_company: 'trades',
  dentist: 'trades', doctor: 'trades', veterinary_care: 'trades',
}

export const CATEGORY_HERO_IMAGES: Record<string, string> = {
  hair_care:          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80',
  beauty_salon:       'https://images.unsplash.com/photo-1487412840181-b228e1ad0c4b?w=1600&q=80',
  nail_salon:         'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&q=80',
  spa:                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&q=80',
  florist:            'https://images.unsplash.com/photo-1487530811015-780c2e8e27b7?w=1600&q=80',
  gym:                'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
  fitness_center:     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
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
  laundry:            'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=1600&q=80',
  dry_cleaning:       'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=1600&q=80',
  auto_repair:        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80',
  car_wash:           'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1600&q=80',
  locksmith:          'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1600&q=80',
  dentist:            'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&q=80',
  doctor:             'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1600&q=80',
  veterinary_care:    'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1600&q=80',
}

export function getHeroImage(types: string[]): string {
  for (const t of types) {
    const img = CATEGORY_HERO_IMAGES[t.toLowerCase()]
    if (img) return img
  }
  return CATEGORY_HERO_IMAGES.restaurant
}

export function getTemplateName(types: string[] = []): string {
  for (const t of types) {
    const key = t.toLowerCase().replace(/ /g, '_')
    if (TEMPLATE_MAP[key]) return TEMPLATE_MAP[key]
  }
  return 'restaurant'
}

export function buildTemplateData(
  aiContent: Record<string, unknown>,
  lead: Record<string, unknown>
): Record<string, unknown> {
  const types = (lead.types as string[] | undefined) || (lead.category ? [lead.category as string] : [])
  return {
    ...aiContent,
    heroImageUrl:   (aiContent.heroImageUrl as string) || getHeroImage(types),
    name:           lead.name,
    address:        lead.address,
    addressEncoded: encodeURIComponent((lead.address as string) || ''),
    phone:          lead.phone || '',
    email:          lead.email || '',
    hours:          lead.hours || [],
    rating:         lead.rating || null,
    reviewCount:    lead.reviewCount || 0,
    socialProfiles: lead.socialProfiles || {},
    yelpUrl:        lead.yelpUrl || null,
    year:           new Date().getFullYear(),
    portalUrl:      process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mariettawebsites.vercel.app',
    slug:           lead.slug,
    reviews: ((lead.reviews as Array<{author?: string; text?: string; stars?: string; time?: string}>) || [])
      .filter(r => r.text?.trim()),
  }
}

export function renderSiteHtml(templateName: string, data: Record<string, unknown>): string {
  const templateDir = path.join(process.cwd(), 'templates', templateName)
  const rawHtml = fs.readFileSync(path.join(templateDir, 'index.html'), 'utf8')
  return renderTemplate(rawHtml, data)
}

export function getTemplateCss(templateName: string): string {
  const templateDir = path.join(process.cwd(), 'templates', templateName)
  return fs.readFileSync(path.join(templateDir, 'style.css'), 'utf8')
}

function renderTemplate(html: string, data: Record<string, unknown>): string {
  // {{#if key}} ... {{/if}}
  html = html.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
    const val = resolvePath(data, key)
    const truthy = Array.isArray(val) ? val.length > 0 : !!val
    return truthy ? inner : ''
  })

  // {{#each array}} ... {{/each}}
  html = html.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, inner) => {
    const arr = resolvePath(data, key)
    if (!Array.isArray(arr)) return ''
    return arr.map(item => {
      let block = inner
      if (typeof item === 'string') {
        block = block.replace(/\{\{this\}\}/g, escapeHtml(item))
      } else if (item && typeof item === 'object') {
        block = block.replace(/\{\{this\.([\w.]+)\}\}/g, (_: string, prop: string) =>
          escapeHtml(String(resolvePath(item as Record<string, unknown>, prop) ?? ''))
        )
      }
      return block
    }).join('\n')
  })

  // {{variable}}
  html = html.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const val = resolvePath(data, key)
    return val != null ? escapeHtml(String(val)) : ''
  })

  return html
}

function resolvePath(obj: unknown, pathStr: string): unknown {
  return pathStr.split('.').reduce((acc: unknown, k: string) =>
    (acc != null && typeof acc === 'object') ? (acc as Record<string, unknown>)[k] : null, obj)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
