/**
 * Netlify deploy helper — self-contained for Vercel portal use.
 */

import { createHash } from 'crypto'

const TOKEN = process.env.NETLIFY_TOKEN!
const BASE = 'https://api.netlify.com/api/v1'

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Netlify API ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiUpload(deployId: string, filePath: string, content: Buffer, contentType: string) {
  const res = await fetch(`${BASE}/deploys/${deployId}/files${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': contentType
    },
    body: content as unknown as BodyInit
  })
  if (!res.ok) throw new Error(`Upload failed for ${filePath}: ${res.status}`)
}

export async function deployToNetlify(
  siteId: string,
  files: Record<string, Buffer>
): Promise<string> {
  // Build digest map
  const digestMap: Record<string, string> = {}
  for (const [filePath, content] of Object.entries(files)) {
    digestMap[filePath] = createHash('sha1').update(content).digest('hex')
  }

  // Create deploy
  const deploy = await api('POST', `/sites/${siteId}/deploys`, { files: digestMap, async: false })
  const deployId = deploy.id
  const required: string[] = deploy.required || []

  // Upload required files
  for (const sha of required) {
    const filePath = Object.keys(digestMap).find(k => digestMap[k] === sha)
    if (!filePath) continue
    const content = files[filePath]
    const contentType = filePath.endsWith('.html') ? 'text/html'
      : filePath.endsWith('.css')  ? 'text/css'
      : filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg'
      : filePath.endsWith('.png')  ? 'image/png'
      : filePath.endsWith('.webp') ? 'image/webp'
      : 'application/octet-stream'
    await apiUpload(deployId, filePath, content, contentType)
  }

  // Wait for ready
  let state = deploy.state
  let attempts = 0
  while (state !== 'ready' && attempts < 20) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await api('GET', `/deploys/${deployId}`)
    state = poll.state
    attempts++
  }

  const final = await api('GET', `/deploys/${deployId}`)
  return final.ssl_url || final.url
}
