/**
 * All Supabase DB access via raw REST fetch — supabase-js v2.43.4 doesn't
 * handle the sb_secret_... key format correctly for server-side queries.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function headers(extra?: Record<string, string>) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export interface ClientRecord {
  id?: string
  slug: string
  business_name: string
  email: string | null
  phone: string | null
  address: string | null
  hours: string[]
  netlify_site_id: string
  netlify_url: string
  template_name: string
  ai_content: Record<string, unknown>
  lead_data: Record<string, unknown>
  status: string
  onboarded_at?: string
  last_deployed_at?: string | null
}

export async function getClientBySlug(slug: string): Promise<ClientRecord | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}&select=*`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`DB error: ${res.status} ${await res.text()}`)
  const rows: ClientRecord[] = await res.json()
  return rows[0] ?? null
}

export async function getClientByEmail(email: string): Promise<ClientRecord | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?email=ilike.${encodeURIComponent(email)}&select=*`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`DB error: ${res.status} ${await res.text()}`)
  const rows: ClientRecord[] = await res.json()
  return rows[0] ?? null
}

export async function getAllClients(): Promise<ClientRecord[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=*&order=onboarded_at.desc`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`DB error: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function upsertClient(record: ClientRecord): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error(`DB upsert failed: ${await res.text()}`)
}

export async function updateClientContent(
  slug: string,
  aiContent: Record<string, unknown>,
  leadData: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        ai_content: aiContent,
        lead_data: leadData,
        last_deployed_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) throw new Error(`DB update failed: ${await res.text()}`)
}
