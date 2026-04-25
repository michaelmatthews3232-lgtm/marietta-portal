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
  plumber: 'trades', electrician: 'trades', painter: 'trades',
  general_contractor: 'trades', roofing_contractor: 'trades',
}

export function getTemplateName(types: string[] = []): string {
  for (const t of types) {
    const key = t.toLowerCase().replace(/ /g, '_')
    if (TEMPLATE_MAP[key]) return TEMPLATE_MAP[key]
  }
  return 'restaurant'
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
    return val ? inner : ''
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
