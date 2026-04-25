'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Client {
  name: string; slug: string; netlifyUrl: string; address: string
  phone: string; email: string; onboardedAt: string; status: string
}

interface Lead {
  placeId: string; name: string; address: string; phone: string | null
  rating: number | null; reviewCount: number; types: string[]
  hours: string[]; googleUrl: string; summary: string | null; category: string
}

const STATUS_OPTIONS = ['pending', 'paid', 'active', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', active: 'Active', cancelled: 'Cancelled'
}
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#dcfce7', color: '#166534' },
  paid:      { bg: '#dbeafe', color: '#1e40af' },
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
}

const BUSINESS_TYPES = [
  { value: 'hair_care',           label: 'Hair Salon' },
  { value: 'beauty_salon',        label: 'Beauty Salon' },
  { value: 'nail_salon',          label: 'Nail Salon' },
  { value: 'spa',                 label: 'Spa' },
  { value: 'restaurant',          label: 'Restaurant' },
  { value: 'cafe',                label: 'Cafe' },
  { value: 'bakery',              label: 'Bakery' },
  { value: 'bar',                 label: 'Bar' },
  { value: 'plumber',             label: 'Plumber' },
  { value: 'electrician',         label: 'Electrician' },
  { value: 'general_contractor',  label: 'General Contractor' },
  { value: 'auto_repair',         label: 'Auto Repair' },
  { value: 'dentist',             label: 'Dentist' },
  { value: 'gym',                 label: 'Gym / Fitness' },
  { value: 'florist',             label: 'Florist' },
  { value: 'laundry',             label: 'Laundry' },
]

export default function AdminPage() {
  const router = useRouter()
  const [clients, setClients]           = useState<Client[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [saving, setSaving]             = useState<string | null>(null)
  const [feedback, setFeedback]         = useState<Record<string, string>>({})
  const [emailInputs, setEmailInputs]   = useState<Record<string, string>>({})
  const [domainInputs, setDomainInputs] = useState<Record<string, string>>({})

  // Find new leads state
  const [showFind, setShowFind]         = useState(false)
  const [findType, setFindType]         = useState('hair_care')
  const [findLocation, setFindLocation] = useState('Marietta, GA')
  const [findLoading, setFindLoading]   = useState(false)
  const [findResults, setFindResults]   = useState<Lead[]>([])
  const [findError, setFindError]       = useState('')
  const [building, setBuilding]         = useState<string | null>(null)
  const [buildFeedback, setBuildFeedback] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      loadClients()
    })
  }, [])

  async function loadClients() {
    const res = await fetch('/api/site-config?admin=true')
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function manage(slug: string, action: string, value: string) {
    if (!value.trim()) return
    setSaving(`${slug}-${action}`)
    setFeedback(f => ({ ...f, [slug]: '' }))
    const res = await fetch('/api/manage-client', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action, value })
    })
    const data = await res.json()
    setSaving(null)
    if (data.success) {
      setFeedback(f => ({ ...f, [slug]: action === 'set_domain' ? 'Domain set! DNS instructions below.' : 'Saved ✓' }))
      loadClients()
    } else {
      setFeedback(f => ({ ...f, [slug]: `Error: ${data.error}` }))
    }
  }

  async function searchLeads() {
    setFindLoading(true); setFindError(''); setFindResults([])
    const res = await fetch(`/api/find-leads?type=${findType}&location=${encodeURIComponent(findLocation)}`)
    const data = await res.json()
    setFindLoading(false)
    if (res.ok) setFindResults(data)
    else setFindError(data.error || 'Search failed')
  }

  async function buildSite(lead: Lead) {
    setBuilding(lead.placeId)
    setBuildFeedback(f => ({ ...f, [lead.placeId]: '' }))
    const res = await fetch('/api/onboard-one', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    })
    const data = await res.json()
    setBuilding(null)
    if (data.success) {
      setBuildFeedback(f => ({ ...f, [lead.placeId]: `✓ Live at ${data.url}` }))
      loadClients()
    } else if (res.status === 409) {
      setBuildFeedback(f => ({ ...f, [lead.placeId]: 'Already built — check dashboard' }))
    } else {
      setBuildFeedback(f => ({ ...f, [lead.placeId]: `Error: ${data.error}` }))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:     clients.length,
    paid:      clients.filter(c => c.status === 'paid').length,
    active:    clients.filter(c => c.status === 'active').length,
    pending:   clients.filter(c => c.status === 'pending').length,
  }

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <span style={s.brand}>MariettaWebsites</span>
            <h1 style={s.title}>Admin Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowFind(v => !v); setFindResults([]) }} style={s.findBtn}>
              {showFind ? '✕ Close' : '+ Find New Leads'}
            </button>
            <button onClick={handleLogout} style={s.logoutBtn}>Log Out</button>
          </div>
        </div>

        {/* Find New Leads Panel */}
        {showFind && (
          <div style={s.findPanel}>
            <h2 style={s.findTitle}>Find Businesses Without Websites</h2>
            <p style={s.findDesc}>Search your area for businesses that don't have a website. Click "Build Site" to run the full pipeline — Claude writes the copy, we deploy it to Netlify, and it appears in your dashboard ready to sell.</p>
            <div style={s.findForm}>
              <select value={findType} onChange={e => setFindType(e.target.value)} style={s.findSelect}>
                {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                type="text" placeholder="City, State (e.g. Marietta, GA)"
                value={findLocation} onChange={e => setFindLocation(e.target.value)}
                style={s.findInput}
                onKeyDown={e => e.key === 'Enter' && searchLeads()}
              />
              <button onClick={searchLeads} disabled={findLoading} style={s.searchBtn}>
                {findLoading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>

            {findError && <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: '8px 0 0' }}>{findError}</p>}

            {findResults.length > 0 && (
              <div>
                <p style={s.findCount}>{findResults.length} businesses found without websites</p>
                <div style={s.leadList}>
                  {findResults.map(lead => (
                    <div key={lead.placeId} style={s.leadCard}>
                      <div style={s.leadLeft}>
                        <p style={s.leadName}>{lead.name}</p>
                        <p style={s.leadAddr}>{lead.address}</p>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          {lead.phone && <span style={s.leadMeta}>📞 {lead.phone}</span>}
                          {lead.rating && <span style={s.leadMeta}>⭐ {lead.rating} ({lead.reviewCount})</span>}
                          {lead.summary && <span style={{ ...s.leadMeta, fontStyle: 'italic', color: '#6b7280' }}>"{lead.summary}"</span>}
                        </div>
                        {buildFeedback[lead.placeId] && (
                          <p style={{ fontSize: '0.82rem', marginTop: 6, color: buildFeedback[lead.placeId].startsWith('Error') ? '#ef4444' : '#166534', fontWeight: 500 }}>
                            {buildFeedback[lead.placeId]}
                          </p>
                        )}
                      </div>
                      <div style={s.leadRight}>
                        <button
                          onClick={() => buildSite(lead)}
                          disabled={building === lead.placeId || !!buildFeedback[lead.placeId]}
                          style={{
                            ...s.buildBtn,
                            opacity: building === lead.placeId || buildFeedback[lead.placeId] ? 0.6 : 1,
                          }}>
                          {building === lead.placeId ? 'Building...' : buildFeedback[lead.placeId] ? 'Done ✓' : 'Build Site'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!findLoading && findResults.length === 0 && !findError && (
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: 12 }}>
                Select a business type and location above, then click Search.
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { label: 'Total Sites',    val: stats.total },
            { label: 'Paid Clients',   val: stats.paid,    highlight: true },
            { label: 'Active',         val: stats.active },
            { label: 'Pending Leads',  val: stats.pending, warn: true },
          ].map(stat => (
            <div key={stat.label} style={{ ...s.stat, background: stat.highlight ? '#1a1a1a' : stat.warn && stat.val > 0 ? '#fff7ed' : '#fff' }}>
              <span style={{ ...s.statNum, color: stat.highlight ? '#c8913a' : stat.warn && stat.val > 0 ? '#ea580c' : '#111' }}>{stat.val}</span>
              <span style={{ ...s.statLabel, color: stat.highlight ? '#999' : '#6b7280' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <input type="text" placeholder="Search clients..." value={search}
          onChange={e => setSearch(e.target.value)} style={s.search} />

        {/* Client List */}
        {loading ? <div style={s.empty}>Loading...</div> : filtered.length === 0 ? (
          <div style={s.empty}>No clients yet. Use "Find New Leads" to get started.</div>
        ) : (
          <div style={s.list}>
            {filtered.map(client => {
              const isOpen = expanded === client.slug
              const sc = STATUS_COLORS[client.status] || STATUS_COLORS.pending
              const isSaving = saving?.startsWith(client.slug)

              return (
                <div key={client.slug} style={s.card}>
                  <div style={s.cardTop} onClick={() => setExpanded(isOpen ? null : client.slug)}>
                    <div style={s.cardLeft}>
                      <h2 style={s.clientName}>{client.name}</h2>
                      <p style={s.clientAddr}>{client.address}</p>
                      <div style={s.cardMeta}>
                        {client.phone && <span style={s.metaItem}>📞 {client.phone}</span>}
                        {client.email
                          ? <span style={s.metaItem}>✉ {client.email}</span>
                          : <span style={{ ...s.metaItem, color: '#ef4444' }}>✉ No email yet</span>
                        }
                      </div>
                    </div>
                    <div style={s.cardRight}>
                      <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>{STATUS_LABELS[client.status] || client.status}</span>
                      <span style={s.chevron}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  <div style={s.quickActions}>
                    <a href={client.netlifyUrl} target="_blank" rel="noopener" style={s.liveBtn}>View Site ↗</a>
                    <button onClick={() => router.push(`/dashboard?client=${client.slug}`)} style={s.editBtn}>Edit Site</button>
                    <span style={s.addedDate}>Added {new Date(client.onboardedAt).toLocaleDateString()}</span>
                  </div>

                  {isOpen && (
                    <div style={s.expandedPanel}>

                      {/* Status */}
                      <div style={s.section}>
                        <h3 style={s.sectionTitle}>Status</h3>
                        <div style={s.statusBtns}>
                          {STATUS_OPTIONS.map(st => {
                            const c = STATUS_COLORS[st]
                            return (
                              <button key={st}
                                onClick={() => manage(client.slug, 'set_status', st)}
                                disabled={isSaving || client.status === st}
                                style={{
                                  ...s.statusBtn,
                                  background: client.status === st ? c.bg : '#f9fafb',
                                  color: client.status === st ? c.color : '#6b7280',
                                  border: `1px solid ${client.status === st ? c.color + '40' : '#e5e7eb'}`,
                                  fontWeight: client.status === st ? 700 : 400
                                }}>
                                {STATUS_LABELS[st]}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Client Email */}
                      <div style={s.section}>
                        <h3 style={s.sectionTitle}>Client Portal Login</h3>
                        <p style={s.sectionDesc}>Set the business owner's email so they can log into their dashboard.</p>
                        <div style={s.inputRow}>
                          <input type="email" placeholder="owner@theirbusiness.com"
                            value={emailInputs[client.slug] ?? client.email ?? ''}
                            onChange={e => setEmailInputs(x => ({ ...x, [client.slug]: e.target.value }))}
                            style={s.input} />
                          <button onClick={() => manage(client.slug, 'set_email', emailInputs[client.slug] ?? '')}
                            disabled={isSaving} style={s.actionBtn}>
                            {saving === `${client.slug}-set_email` ? 'Saving...' : 'Save Email'}
                          </button>
                        </div>
                        {client.email && (
                          <p style={s.hintText}>
                            Client login: <strong>https://mariettawebsites.vercel.app/login</strong><br />
                            They enter <strong>{client.email}</strong> and get a magic link.
                          </p>
                        )}
                      </div>

                      {/* Domain */}
                      <div style={s.section}>
                        <h3 style={s.sectionTitle}>Custom Domain</h3>
                        <p style={s.sectionDesc}>
                          Current: <a href={client.netlifyUrl} target="_blank" rel="noopener" style={{ color: '#c8913a' }}>{client.netlifyUrl}</a>
                        </p>
                        <div style={s.inputRow}>
                          <input type="text" placeholder="theirbusiness.com"
                            value={domainInputs[client.slug] ?? ''}
                            onChange={e => setDomainInputs(x => ({ ...x, [client.slug]: e.target.value }))}
                            style={s.input} />
                          <button onClick={() => manage(client.slug, 'set_domain', domainInputs[client.slug] ?? '')}
                            disabled={isSaving} style={s.actionBtn}>
                            {saving === `${client.slug}-set_domain` ? 'Assigning...' : 'Assign Domain'}
                          </button>
                        </div>
                        <div style={s.dnsBox}>
                          <p style={s.dnsTitle}>📋 Point DNS to Netlify after buying the domain:</p>
                          <p style={s.dnsRow}><strong>Type:</strong> A &nbsp;&nbsp; <strong>Name:</strong> @ &nbsp;&nbsp; <strong>Value:</strong> 75.2.60.5</p>
                          <p style={s.dnsRow}><strong>Type:</strong> CNAME &nbsp;&nbsp; <strong>Name:</strong> www &nbsp;&nbsp; <strong>Value:</strong> apex-loadbalancer.netlify.com</p>
                        </div>
                      </div>

                      {/* Google Visibility */}
                      <div style={s.section}>
                        <h3 style={s.sectionTitle}>Google Visibility</h3>
                        <div style={s.googleSteps}>
                          {[
                            { n: 1, title: 'Google Search Console', desc: 'Verify ownership so Google indexes the site. Go to search.google.com/search-console → Add Property → URL prefix → verify via HTML tag. Use "Edit Site" to add the verification tag via AI prompt.' },
                            { n: 2, title: 'Google Business Profile', desc: 'Most important for local search. Go to business.google.com → claim the listing → add their website URL. This is what shows them in Google Maps.' },
                            { n: 3, title: 'Request Indexing', desc: 'In Search Console → URL Inspection → enter their homepage → "Request Indexing". Google will crawl within 1–3 days.' },
                          ].map(step => (
                            <div key={step.n} style={s.googleStep}>
                              <span style={s.stepNum}>{step.n}</span>
                              <div><strong style={{ fontSize: '0.88rem' }}>{step.title}</strong>
                                <p style={s.stepDesc}>{step.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {feedback[client.slug] && (
                        <div style={{ ...s.feedback, color: feedback[client.slug].startsWith('Error') ? '#ef4444' : '#166534', background: feedback[client.slug].startsWith('Error') ? '#fee2e2' : '#dcfce7' }}>
                          {feedback[client.slug]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: '32px 16px' },
  container: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#c8913a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  title: { fontSize: '1.6rem', fontWeight: 700, margin: 0 },
  findBtn: { padding: '10px 20px', background: '#c8913a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' },
  logoutBtn: { padding: '10px 20px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', cursor: 'pointer' },

  // Find panel
  findPanel: { background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  findTitle: { fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px' },
  findDesc: { fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px', lineHeight: 1.6 },
  findForm: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  findSelect: { padding: '10px 14px', fontSize: '0.9rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', minWidth: 180 },
  findInput: { flex: 1, minWidth: 200, padding: '10px 14px', fontSize: '0.9rem', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' },
  searchBtn: { padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  findCount: { fontSize: '0.85rem', fontWeight: 600, color: '#374151', margin: '16px 0 10px' },
  leadList: { display: 'flex', flexDirection: 'column', gap: 10 },
  leadCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  leadLeft: { flex: 1 },
  leadRight: { flexShrink: 0 },
  leadName: { fontWeight: 700, fontSize: '0.95rem', margin: '0 0 2px' },
  leadAddr: { fontSize: '0.8rem', color: '#6b7280', margin: '0 0 6px' },
  leadMeta: { fontSize: '0.8rem', color: '#374151' },
  buildBtn: { padding: '8px 18px', background: '#c8913a', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  // Stats
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  stat: { borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  statNum: { fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: '0.78rem', fontWeight: 500 },
  search: { padding: '12px 16px', fontSize: '0.95rem', border: '1px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { textAlign: 'center', padding: 48, color: '#9ca3af', background: '#fff', borderRadius: 12 },

  // Client cards
  card: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 12px', cursor: 'pointer' },
  cardLeft: { flex: 1 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  clientName: { fontSize: '1.05rem', fontWeight: 700, margin: '0 0 3px' },
  clientAddr: { fontSize: '0.82rem', color: '#6b7280', margin: '0 0 8px' },
  cardMeta: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  metaItem: { fontSize: '0.83rem', color: '#374151' },
  badge: { padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 },
  chevron: { fontSize: '0.75rem', color: '#9ca3af' },
  quickActions: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px 16px', flexWrap: 'wrap' },
  liveBtn: { padding: '7px 16px', background: '#1a1a1a', color: '#fff', borderRadius: 7, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' },
  editBtn: { padding: '7px 16px', background: '#c8913a', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  addedDate: { fontSize: '0.76rem', color: '#9ca3af', marginLeft: 'auto' },
  expandedPanel: { borderTop: '1px solid #f3f4f6', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: '0.88rem', fontWeight: 700, color: '#111', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  sectionDesc: { fontSize: '0.83rem', color: '#6b7280', margin: 0 },
  statusBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  statusBtn: { padding: '6px 18px', borderRadius: 20, fontSize: '0.83rem', cursor: 'pointer' },
  inputRow: { display: 'flex', gap: 10 },
  input: { flex: 1, padding: '10px 14px', fontSize: '0.9rem', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' },
  actionBtn: { padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  hintText: { fontSize: '0.8rem', color: '#6b7280', background: '#f9fafb', padding: '10px 14px', borderRadius: 8, margin: 0, lineHeight: 1.6 },
  dnsBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
  dnsTitle: { fontSize: '0.83rem', fontWeight: 600, color: '#374151', margin: 0 },
  dnsRow: { fontSize: '0.82rem', color: '#374151', margin: 0, fontFamily: 'monospace' },
  googleSteps: { display: 'flex', flexDirection: 'column', gap: 14 },
  googleStep: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, background: '#1a1a1a', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: 1 },
  stepDesc: { fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 0', lineHeight: 1.6 },
  feedback: { padding: '12px 16px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 500 },
}
