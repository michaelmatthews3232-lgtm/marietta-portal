'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SiteConfig {
  name: string
  phone: string
  email: string
  address: string
  hours: string[]
  slug: string
  netlifyUrl: string
}

const EXAMPLE_PROMPTS = [
  'Update my hours — we\'re now closed on Sundays',
  'Add a new service: Knotless Braids for $200',
  'Change my phone number to (770) 555-0123',
  'Update my about section — we just celebrated 10 years in business',
  'Remove the highlight treatment from my services list',
  'Change the tagline to "Where every cut tells a story"',
]

export default function Dashboard() {
  const router = useRouter()
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [prompt, setPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ url: string; summary: string } | null>(null)
  const [aiError, setAiError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [form, setForm] = useState<Partial<SiteConfig>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }

      // Check for ?client=slug in URL (admin viewing a specific client)
      const params = new URLSearchParams(window.location.search)
      const clientSlug = params.get('client')

      if (clientSlug) {
        loadSiteConfigBySlug(clientSlug)
      } else {
        loadSiteConfig(data.user.email!)
      }
    })
  }, [])

  async function loadSiteConfig(email: string) {
    const res = await fetch(`/api/site-config?email=${encodeURIComponent(email)}`)
    if (!res.ok) { setPageError('Could not load your site. Contact support.'); return }
    const data = await res.json()

    // Admin email — redirect to admin panel
    if (data.isAdmin) { router.push('/admin'); return }

    setConfig(data)
    setForm({ phone: data.phone, email: data.email, hours: data.hours })
  }

  async function loadSiteConfigBySlug(slug: string) {
    const res = await fetch(`/api/site-config?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) { setPageError('Could not load that site. Contact support.'); return }
    const data: SiteConfig = await res.json()
    setConfig(data)
    setForm({ phone: data.phone, email: data.email, hours: data.hours })
  }

  async function handleAiUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || !config) return
    setAiLoading(true)
    setAiResult(null)
    setAiError('')

    const res = await fetch('/api/ai-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: config.slug, prompt })
    })

    setAiLoading(false)
    if (res.ok) {
      const data = await res.json()
      setAiResult({ url: data.url, summary: data.summary })
      setPrompt('')
      // Reload config to reflect any lead field changes
      loadSiteConfig(config.email)
    } else {
      const data = await res.json()
      setAiError(data.error || 'Something went wrong. Please try again.')
    }
  }

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const res = await fetch('/api/update-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: config?.slug, updates: form })
    })

    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 5000) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (pageError) return <div style={s.page}><p style={{ color: 'red', padding: 32 }}>{pageError}</p></div>
  if (!config) return (
    <div style={s.page}>
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={{ color: '#6b7280', marginTop: 16 }}>Loading your site...</p>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <span style={s.brand}>MariettaWebsites</span>
            <h1 style={s.siteName}>{config.name}</h1>
          </div>
          <div style={s.headerRight}>
            <a href={config.netlifyUrl} target="_blank" rel="noopener" style={s.viewBtn}>
              View Live Site ↗
            </a>
            <button onClick={handleLogout} style={s.logoutBtn}>Log Out</button>
          </div>
        </div>

        {/* AI Prompt Card */}
        <div style={s.aiCard}>
          <div style={s.aiHeader}>
            <div>
              <h2 style={s.aiTitle}>Update Your Website</h2>
              <p style={s.aiSub}>Just type what you want to change — in plain English. Your site updates automatically.</p>
            </div>
            <div style={s.aiBadge}>AI Powered</div>
          </div>

          <form onSubmit={handleAiUpdate}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. &quot;Add a new service: Knotless Braids for $200. Also update my hours — we're now open until 8pm on weekdays.&quot;"
              style={s.promptBox}
              rows={4}
              disabled={aiLoading}
            />

            <div style={s.promptFooter}>
              <button
                type="submit"
                disabled={aiLoading || !prompt.trim()}
                style={{ ...s.aiBtn, opacity: (!prompt.trim() || aiLoading) ? 0.5 : 1 }}
              >
                {aiLoading ? (
                  <span style={s.btnInner}>
                    <span style={s.btnSpinner} />
                    Updating your site...
                  </span>
                ) : (
                  '✦  Update My Site'
                )}
              </button>
              {aiLoading && (
                <span style={s.loadingNote}>Claude is reading your request and rebuilding your site. Usually takes 20–40 seconds.</span>
              )}
            </div>
          </form>

          {/* Example prompts */}
          <div style={s.examplesWrap}>
            <span style={s.examplesLabel}>Try:</span>
            <div style={s.examplePills}>
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button key={i} onClick={() => setPrompt(ex)} style={s.pill} disabled={aiLoading}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Success */}
          {aiResult && (
            <div style={s.successBox}>
              <span style={s.successIcon}>✓</span>
              <div>
                <p style={s.successTitle}>{aiResult.summary}</p>
                <p style={s.successSub}>
                  Your site is live at{' '}
                  <a href={aiResult.url} target="_blank" rel="noopener" style={s.successLink}>
                    {aiResult.url}
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div style={s.errorBox}>
              <p>⚠ {aiError}</p>
            </div>
          )}
        </div>

        {/* Manual Edit Toggle */}
        <div style={s.manualToggleWrap}>
          <button onClick={() => setShowManual(v => !v)} style={s.manualToggle}>
            {showManual ? '▲ Hide' : '▼ Show'} manual edit fields
          </button>
        </div>

        {showManual && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Manual Edits</h2>
            <p style={s.cardSub}>Directly edit specific fields. Changes go live on save.</p>

            <form onSubmit={handleManualSave} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={s.input}
                  placeholder="(404) 555-0100"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Contact Email (shown on site)</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Business Hours (one per line)</label>
                <textarea
                  value={(form.hours || []).join('\n')}
                  onChange={e => setForm(f => ({ ...f, hours: e.target.value.split('\n') }))}
                  style={{ ...s.input, minHeight: 160, resize: 'vertical' as const }}
                  placeholder={"Monday: 9am - 5pm\nTuesday: 9am - 5pm"}
                />
              </div>
              <button type="submit" disabled={saving} style={s.saveBtn}>
                {saving ? 'Saving...' : 'Save & Publish'}
              </button>
              {saved && <div style={s.successBox}><span style={s.successIcon}>✓</span><p style={s.successTitle}>Saved and live!</p></div>}
            </form>
          </div>
        )}

        {/* Site Info */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Your Site Details</h2>
          <div style={s.infoRow}><span style={s.infoLabel}>Live URL</span><a href={config.netlifyUrl} target="_blank" rel="noopener" style={{ color: '#c8913a' }}>{config.netlifyUrl}</a></div>
          <div style={s.infoRow}><span style={s.infoLabel}>Phone</span><span>{config.phone || '—'}</span></div>
          <div style={s.infoRow}><span style={s.infoLabel}>Address</span><span>{config.address}</span></div>
        </div>

      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: '32px 16px' },
  container: { maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #c8913a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  brand: { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#c8913a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  siteName: { fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#111' },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  viewBtn: { padding: '10px 20px', background: '#1a1a1a', color: '#fff', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600 },
  logoutBtn: { padding: '10px 20px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem', cursor: 'pointer', color: '#374151' },

  aiCard: { background: '#1a1a1a', borderRadius: 14, padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  aiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  aiTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 6px' },
  aiSub: { color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: 0, maxWidth: 480 },
  aiBadge: { background: 'rgba(200,145,58,0.2)', color: '#c8913a', border: '1px solid rgba(200,145,58,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },

  promptBox: {
    width: '100%', padding: '16px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff',
    resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
    fontFamily: 'Inter, sans-serif'
  },
  promptFooter: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  aiBtn: {
    padding: '13px 28px', background: '#c8913a', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.2s', flexShrink: 0
  },
  btnInner: { display: 'flex', alignItems: 'center', gap: 10 },
  btnSpinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  loadingNote: { color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' },

  examplesWrap: { marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' },
  examplesLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 },
  examplePills: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  pill: {
    padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', cursor: 'pointer',
    transition: 'all 0.15s', fontFamily: 'Inter, sans-serif'
  },

  successBox: { display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '14px 18px', marginTop: 16 },
  successIcon: { fontSize: '1.1rem', color: '#4ade80', flexShrink: 0, marginTop: 1 },
  successTitle: { color: '#4ade80', fontWeight: 600, margin: 0, fontSize: '0.92rem' },
  successSub: { color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.82rem' },
  successLink: { color: '#c8913a' },
  errorBox: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '14px 18px', marginTop: 16, color: '#f87171', fontSize: '0.9rem' },

  manualToggleWrap: { textAlign: 'center' },
  manualToggle: { background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer', padding: '4px 8px' },

  card: { background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px', color: '#111' },
  cardSub: { color: '#6b7280', fontSize: '0.88rem', margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.83rem', fontWeight: 600, color: '#374151' },
  input: { padding: '11px 14px', fontSize: '0.93rem', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
  saveBtn: { padding: '13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },

  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.88rem', flexWrap: 'wrap', gap: 8 },
  infoLabel: { fontWeight: 600, color: '#6b7280' },
}
