'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface CallerLead {
  slug: string; name: string; address: string; phone: string
  netlifyUrl: string; status: string; templateName: string
  callCount: number; lastCalledAt: string | null
  nextCallbackDate: string | null; callerNotes: string | null
  callerInterested: boolean; rating: number | null; reviewCount: number
}

interface CallLog {
  id: string; caller_email: string; called_at: string
  outcome: string; notes: string | null; callback_date: string | null
}

type Outcome = 'no_answer' | 'voicemail' | 'interested' | 'not_interested' | 'callback'
type Tab = 'queue' | 'callbacks' | 'interested'

// ─── Scripts ─────────────────────────────────────────────────────────────────

function getScript(templateName: string) {
  const t = (templateName || '').toLowerCase()
  const isFood     = ['restaurant','food','cafe','bar','bakery','meal_takeaway','meal_delivery'].includes(t)
  const isBeauty   = ['hair_care','beauty_salon','nail_salon','spa','florist'].includes(t)
  const isTrades   = ['plumber','electrician','painter','general_contractor','roofing_contractor','auto_repair','locksmith','moving_company','laundry','dry_cleaning','car_wash'].includes(t)
  const isHealth   = ['dentist','doctor','veterinary_care'].includes(t)
  const isFitness  = ['gym','fitness_center','yoga'].includes(t)

  if (isFood) return {
    label: 'Restaurant / Food',
    opening: `"Hi, is this the owner of [Business Name]? Great — my name is [Your Name]. I'm calling because I noticed [Business Name] either doesn't have a website, or it's not showing up when people Google [type of place] nearby.\n\nI went ahead and built you a free preview site — it has your menu, hours, photos, and an online ordering button already on it. Mind if I send you the link to check it out?"`,
    props: ['We build and manage everything — 5 minutes of your time total', 'Shows up on Google when people search for food near them', 'Online menu + ordering built in — no more lost phone orders', '$97 setup + $49/month — one extra table per week pays for it'],
    objections: [
      { q: '"We already have a Facebook page"', a: '"Facebook is great for regulars — but 70% of people Google restaurants before they go out. Google shows your website first, not Facebook. We link your Facebook into the site too."' },
      { q: '"We\'re too busy"', a: '"That\'s why this works — we do everything. You just look at the preview, say yes, and you\'re live today. Literally 5 minutes of your time."' },
      { q: '"How much does it cost?"', a: '"$97 one-time to launch, then $49/month. We host it, update it, handle everything. Most owners make that back with one extra table a week."' },
      { q: '"I need to think about it"', a: '"Of course — can I just text you the link? It\'s already built with your info. Takes 30 seconds to look at, zero commitment."' },
    ],
    closing: `"The site is live right now. I just need your go-ahead and we can get payment done today — you'd be fully live by tonight. Want me to send the link?"`,
  }

  if (isBeauty) return {
    label: 'Beauty & Salon',
    opening: `"Hi, is this the owner of [Business Name]? My name is [Your Name] — salons with a website and online booking button get about 30% more appointments on average.\n\nI built you a free preview site with a booking button, your services listed, and room for your photos. Can I send you the link?"`,
    props: ['Online booking button — clients book while you\'re with someone else', 'Shows up on Google when people search for [salon type] nearby', 'Looks as professional as the top salons in the city', '$97 setup + $49/month — 2 extra appointments and it pays for itself'],
    objections: [
      { q: '"I use Instagram"', a: '"Instagram is perfect for your portfolio — keep using it! But when someone Googles \'nail salon near me\', Instagram doesn\'t show up. Your website does. We link your Instagram right into it."' },
      { q: '"I get clients by referral"', a: '"Referrals are gold — and a website makes them even better. When someone gets referred, the first thing they do is Google you. A beautiful site converts that referral into a booked appointment."' },
      { q: '"I already have a website"', a: '"Great — is it showing up when people Google [salon type] in [city]? A lot of salon sites aren\'t optimized for search. The site I built is. Want to see how they compare?"' },
    ],
    closing: `"The preview is already built specifically for [Business Name]. Honestly just look at it — if you like it, we can have you live today. Can I send you the link?"`,
  }

  if (isTrades) return {
    label: 'Trades & Home Services',
    opening: `"Hi, is this the owner of [Business Name]? My name is [Your Name]. When someone has a burst pipe at midnight or needs an emergency [trade], the first thing they do is Google it. Right now, [Business Name] isn't showing up — or not showing up well enough.\n\nI built you a professional site with your license info, a click-to-call button, and your services listed. Can I send you the link?"`,
    props: ['Shows up on Google when someone needs you urgently — that\'s when they pay anything', 'License, insurance, and reviews front and center — instant trust', 'Click-to-call button above the fold — they call you directly', 'One emergency job covers 6 months of cost'],
    objections: [
      { q: '"I get enough work by word of mouth"', a: '"That\'s great — and a website makes word of mouth even stronger. When someone gets referred to you, they Google you first. No website = doubt. A professional site = instant confidence."' },
      { q: '"I\'m on Yelp / Angi"', a: '"Those platforms take 20-30% per job and show your competitors next to you. Your own website sends calls straight to you — no commission, no competition on the same page."' },
      { q: '"I don\'t have time to manage a website"', a: '"You don\'t — we manage it. Hosting, updates, everything. You just get the calls."' },
    ],
    closing: `"Think about the emergency calls going to whoever shows up on Google right now. The site is ready today. One job covers months. Want me to send the link?"`,
  }

  if (isHealth) return {
    label: 'Healthcare',
    opening: `"Hi, is this [Business Name]? I'm calling because 77% of patients Google a practice before they call. Right now [Business Name] either doesn't have a website or it's not optimized to show up.\n\nI built you a professional preview site that introduces your practice and lets new patients request appointments online. Can I send you the link?"`,
    props: ['77% of patients research online before booking — you need to be there', 'Online appointment request form built in', 'Your credentials and \'accepting new patients\' front and center', 'One new patient covers months of cost'],
    objections: [
      { q: '"We get referrals from other doctors"', a: '"Referrals are great — but patients still Google the practice after they get the referral. A professional site confirms you\'re legitimate and makes them more likely to actually book."' },
      { q: '"We use Zocdoc / a booking platform"', a: '"Those are great for bookings, but they don\'t help with Google visibility. When someone Googles your practice name or \'dentist near me\', your website is what shows up first."' },
    ],
    closing: `"The preview is ready right now. For a practice like yours, first impressions online matter. Let me send you the link — if it looks right, we can get you live by tonight."`,
  }

  if (isFitness) return {
    label: 'Gym & Fitness',
    opening: `"Hi, is this the owner of [Business Name]? My name is [Your Name] — gyms with a professional website and a free trial visible on the homepage convert about 40% more walk-ins into members.\n\nI built you a preview site with a 'Claim Your Free Week' button already on it. Can I send you the link?"`,
    props: ['Free trial CTA converts Google searchers into walk-ins', 'Shows up when people search for gyms nearby — right when motivation is high', 'Your classes, trainers, and pricing all in one place', 'One new member covers months of cost'],
    objections: [
      { q: '"We have an app / Mindbody"', a: '"Those are great for existing members. Your website is for new people who don\'t know you yet — it\'s how they find you on Google and decide to come in."' },
    ],
    closing: `"The site is built and ready. One new member pays for 6 months. Want me to send the link?"`,
  }

  return {
    label: 'Local Business',
    opening: `"Hi, is this the owner of [Business Name]? My name is [Your Name]. I noticed [Business Name] doesn't have a strong web presence showing up on Google. I went ahead and built you a free preview site — it's already live. Mind if I send you the link?"`,
    props: ['We build it for you — no technical work on your end', 'Shows up on Google when local customers search for you', 'Professional design that matches your business', '$97 setup + $49/month — fully managed'],
    objections: [
      { q: '"Not interested"', a: '"Totally fine. Can I just text you the link anyway? It\'s built, it\'s free to look at. If you ever change your mind it\'s right there."' },
    ],
    closing: `"The site is ready. 30 seconds to look at it. Can I send you the link?"`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const OUTCOME_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  no_answer:      { label: '📵 No Answer',      bg: '#f9fafb', color: '#374151', border: '#d1d5db' },
  voicemail:      { label: '📬 Left Voicemail', bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  interested:     { label: '🔥 Interested!',    bg: '#ecfdf5', color: '#065f46', border: '#34d399' },
  not_interested: { label: '❌ Not Interested', bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
  callback:       { label: '📅 Callback Set',   bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' },
}

const TYPE_LABELS: Record<string, string> = {
  restaurant:'Restaurant', food:'Food', cafe:'Cafe', bar:'Bar', bakery:'Bakery',
  meal_takeaway:'Takeout', meal_delivery:'Delivery', hair_care:'Hair Salon',
  beauty_salon:'Beauty Salon', nail_salon:'Nail Salon', spa:'Spa', florist:'Florist',
  gym:'Gym', fitness_center:'Fitness', yoga:'Yoga', plumber:'Plumber',
  electrician:'Electrician', painter:'Painter', general_contractor:'Contractor',
  roofing_contractor:'Roofing', auto_repair:'Auto Repair', locksmith:'Locksmith',
  moving_company:'Movers', dentist:'Dentist', doctor:'Doctor',
  veterinary_care:'Vet', laundry:'Laundry', dry_cleaning:'Dry Cleaning',
  car_wash:'Car Wash', pet_grooming:'Pet Grooming', tattoo:'Tattoo',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallerPage() {
  const router = useRouter()
  const [leads, setLeads]             = useState<CallerLead[]>([])
  const [loading, setLoading]         = useState(true)
  const [callerEmail, setCallerEmail] = useState('')
  const [tab, setTab]                 = useState<Tab>('queue')
  const [scriptFor, setScriptFor]     = useState<CallerLead | null>(null)
  const [historyFor, setHistoryFor]   = useState<string | null>(null)
  const [callLogs, setCallLogs]       = useState<Record<string, CallLog[]>>({})
  const [notes, setNotes]             = useState<Record<string, string>>({})
  const [cbDate, setCbDate]           = useState<Record<string, string>>({})
  const [showCbPicker, setShowCbPicker] = useState<Record<string, boolean>>({})
  const [logging, setLogging]         = useState<string | null>(null)
  const [feedback, setFeedback]       = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setCallerEmail(data.user.email || '')
      loadLeads()
    })
  }, [])

  async function loadLeads() {
    const res  = await fetch('/api/caller-data')
    const data = await res.json()
    if (Array.isArray(data)) {
      setLeads(data)
      // Pre-fill notes from callerNotes
      const n: Record<string, string> = {}
      data.forEach((l: CallerLead) => { if (l.callerNotes) n[l.slug] = l.callerNotes })
      setNotes(prev => ({ ...n, ...prev }))
    }
    setLoading(false)
  }

  async function loadHistory(slug: string) {
    if (callLogs[slug]) { setHistoryFor(slug); return }
    const res  = await fetch(`/api/call-logs?slug=${slug}`)
    const data = await res.json()
    setCallLogs(prev => ({ ...prev, [slug]: Array.isArray(data) ? data : [] }))
    setHistoryFor(slug)
  }

  async function logCall(lead: CallerLead, outcome: Outcome) {
    if (outcome === 'callback' && !cbDate[lead.slug]) {
      setShowCbPicker(p => ({ ...p, [lead.slug]: true }))
      return
    }
    setLogging(lead.slug + outcome)
    const res = await fetch('/api/call-logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug:         lead.slug,
        callerEmail,
        outcome,
        notes:        notes[lead.slug] || '',
        callbackDate: outcome === 'callback' ? cbDate[lead.slug] : undefined,
      }),
    })
    const data = await res.json()
    setLogging(null)
    if (data.success) {
      setFeedback(p => ({ ...p, [lead.slug]: `✓ Logged: ${OUTCOME_STYLE[outcome]?.label}` }))
      setShowCbPicker(p => ({ ...p, [lead.slug]: false }))
      // Invalidate history cache for this lead
      setCallLogs(p => { const n = { ...p }; delete n[lead.slug]; return n })
      if (historyFor === lead.slug) setHistoryFor(null)
      setTimeout(() => setFeedback(p => ({ ...p, [lead.slug]: '' })), 3000)
      loadLeads()
    } else {
      setFeedback(p => ({ ...p, [lead.slug]: `Error: ${data.error}` }))
    }
  }

  // ─── Derived lists ─────────────────────────────────────────────────────────

  const todayStr = today()
  const callsToday = leads.reduce((n, l) => {
    if (l.lastCalledAt && l.lastCalledAt.startsWith(todayStr)) return n + 1
    return n
  }, 0)

  const callbackLeads  = leads.filter(l => l.nextCallbackDate && l.nextCallbackDate <= todayStr && !['not_interested','paid','active'].includes(l.status))
  const interestedLeads = leads.filter(l => l.callerInterested && !['not_interested','paid','active'].includes(l.status))
  const queueLeads     = leads
    .filter(l => ['pending','contacted'].includes(l.status) && !l.callerInterested)
    .sort((a, b) => (a.callCount || 0) - (b.callCount || 0))

  const displayed = tab === 'callbacks' ? callbackLeads : tab === 'interested' ? interestedLeads : queueLeads

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading leads...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#111827', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#c8913a' }}>{process.env.NEXT_PUBLIC_BRAND_NAME || 'LocalWebsitesPro'}</span>
          <span style={{ background: '#1f2937', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>CALLER DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{callerEmail}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: '1px solid #374151', color: '#9ca3af', borderRadius: 6, padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#1f2937', borderBottom: '1px solid #374151', padding: '12px 24px', display: 'flex', gap: 32, overflowX: 'auto' }}>
        {[
          { label: 'Calls Today',     value: callsToday,              color: '#60a5fa' },
          { label: 'Callbacks Due',   value: callbackLeads.length,    color: '#fbbf24' },
          { label: 'Interested',      value: interestedLeads.length,  color: '#34d399' },
          { label: 'Total in Queue',  value: queueLeads.length,       color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: 0 }}>
        {([
          { id: 'queue',     label: `📋 Queue`,                  count: queueLeads.length },
          { id: 'callbacks', label: `🔔 Callbacks Due`,          count: callbackLeads.length },
          { id: 'interested',label: `🔥 Interested`,             count: interestedLeads.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t.id ? 700 : 400, fontSize: '0.9rem',
            color: tab === t.id ? '#111827' : '#6b7280',
            borderBottom: tab === t.id ? '2px solid #c8913a' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            <span style={{
              background: t.id === 'callbacks' && t.count > 0 ? '#fee2e2' : t.id === 'interested' && t.count > 0 ? '#ecfdf5' : '#f3f4f6',
              color: t.id === 'callbacks' && t.count > 0 ? '#dc2626' : t.id === 'interested' && t.count > 0 ? '#059669' : '#6b7280',
              borderRadius: 999, padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9ca3af' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
              {tab === 'callbacks' ? '🎉' : tab === 'interested' ? '📭' : '✅'}
            </div>
            <p style={{ fontWeight: 600, color: '#374151' }}>
              {tab === 'callbacks' ? 'No callbacks due!' : tab === 'interested' ? 'No interested leads yet' : 'Queue is empty'}
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
              {tab === 'queue' ? 'Build more leads from the admin panel.' : tab === 'callbacks' ? 'Great work — check back later.' : 'Keep calling — they\'re coming!'}
            </p>
          </div>
        )}

        {displayed.map(lead => (
          <LeadCard
            key={lead.slug}
            lead={lead}
            callerEmail={callerEmail}
            notes={notes[lead.slug] || ''}
            cbDate={cbDate[lead.slug] || ''}
            showCbPicker={!!showCbPicker[lead.slug]}
            loggingOutcome={logging}
            feedbackMsg={feedback[lead.slug] || ''}
            historyOpen={historyFor === lead.slug}
            historyLogs={callLogs[lead.slug] || []}
            scriptOpen={scriptFor?.slug === lead.slug}
            onNotesChange={v => setNotes(p => ({ ...p, [lead.slug]: v }))}
            onCbDateChange={v => setCbDate(p => ({ ...p, [lead.slug]: v }))}
            onToggleCbPicker={() => setShowCbPicker(p => ({ ...p, [lead.slug]: !p[lead.slug] }))}
            onLogCall={outcome => logCall(lead, outcome)}
            onToggleHistory={() => {
              if (historyFor === lead.slug) setHistoryFor(null)
              else loadHistory(lead.slug)
            }}
            onOpenScript={() => setScriptFor(lead)}
          />
        ))}
      </div>

      {/* Script Modal */}
      {scriptFor && (
        <ScriptModal lead={scriptFor} onClose={() => setScriptFor(null)} />
      )}
    </div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, callerEmail, notes, cbDate, showCbPicker, loggingOutcome, feedbackMsg, historyOpen, historyLogs, scriptOpen, onNotesChange, onCbDateChange, onToggleCbPicker, onLogCall, onToggleHistory, onOpenScript }: {
  lead: CallerLead; callerEmail: string; notes: string; cbDate: string
  showCbPicker: boolean; loggingOutcome: string | null; feedbackMsg: string
  historyOpen: boolean; historyLogs: CallLog[]; scriptOpen: boolean
  onNotesChange: (v: string) => void; onCbDateChange: (v: string) => void
  onToggleCbPicker: () => void; onLogCall: (o: Outcome) => void
  onToggleHistory: () => void; onOpenScript: () => void
}) {
  const todayStr = today()
  const isOverdue    = lead.nextCallbackDate && lead.nextCallbackDate < todayStr
  const isDueToday   = lead.nextCallbackDate && lead.nextCallbackDate === todayStr
  const typeLabel    = TYPE_LABELS[lead.templateName] || lead.templateName

  const cardBorder = lead.callerInterested
    ? '2px solid #34d399'
    : isOverdue ? '2px solid #f87171'
    : isDueToday ? '2px solid #fbbf24'
    : '1px solid #e5e7eb'

  const cardAccent = lead.callerInterested ? '#ecfdf5' : isOverdue ? '#fef2f2' : isDueToday ? '#fffbeb' : '#fff'

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: cardBorder, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>

      {/* Card header accent */}
      {(lead.callerInterested || isOverdue || isDueToday) && (
        <div style={{ background: cardAccent, borderBottom: `1px solid ${cardBorder.split(' ')[2]}`, padding: '6px 16px', fontSize: '0.78rem', fontWeight: 600,
          color: lead.callerInterested ? '#059669' : isOverdue ? '#dc2626' : '#92400e' }}>
          {lead.callerInterested ? '🔥 This lead is interested — push for payment!'
           : isOverdue ? `🚨 Callback overdue — was due ${fmtDate(lead.nextCallbackDate!)}`
           : `🔔 Callback due today`}
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>

        {/* Top row: badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: lead.status === 'pending' ? '#dbeafe' : lead.status === 'contacted' ? '#fef9c3' : '#f3f4f6',
            color:      lead.status === 'pending' ? '#1e40af' : lead.status === 'contacted' ? '#854d0e' : '#374151' }}>
            {lead.status === 'pending' ? 'New Lead' : lead.status === 'contacted' ? 'Contacted' : lead.status}
          </span>
          {lead.callCount > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#6b7280', padding: '2px 8px', background: '#f9fafb', borderRadius: 999 }}>
              📞 Called {lead.callCount}x{lead.lastCalledAt ? ` · ${timeSince(lead.lastCalledAt)}` : ''}
            </span>
          )}
          {lead.callCount === 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#2563eb', padding: '2px 8px', background: '#eff6ff', borderRadius: 999 }}>
              ✨ First Call
            </span>
          )}
        </div>

        {/* Business name */}
        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{lead.name}</h2>
        <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#6b7280' }}>📍 {lead.address}</p>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <a href={`tel:${lead.phone?.replace(/\D/g, '')}`} style={{
            flex: '1 1 160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#16a34a', color: '#fff', borderRadius: 8, padding: '12px 16px',
            fontWeight: 700, fontSize: '1rem', textDecoration: 'none', letterSpacing: '0.01em',
          }}>
            📞 {lead.phone || 'No phone'}
          </a>
          {lead.netlifyUrl && (
            <a href={lead.netlifyUrl} target="_blank" rel="noreferrer" style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              🌐 View Their Site
            </a>
          )}
        </div>

        {/* Rating */}
        {lead.rating && (
          <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#6b7280' }}>
            ⭐ {lead.rating} · {lead.reviewCount} Google reviews
          </p>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Call Notes
          </label>
          <textarea
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Who did you speak with? What did they say? Any objections?"
            rows={3}
            style={{ width: '100%', padding: '10px 12px', fontSize: '0.88rem', border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: '#111827' }}
          />
        </div>

        {/* Outcome buttons */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Log This Call:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['no_answer', 'voicemail', 'interested', 'not_interested'] as Outcome[]).map(outcome => (
              <button key={outcome}
                disabled={!!loggingOutcome}
                onClick={() => onLogCall(outcome)}
                style={{
                  flex: '1 1 120px', padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${OUTCOME_STYLE[outcome]?.border}`,
                  background: OUTCOME_STYLE[outcome]?.bg, color: OUTCOME_STYLE[outcome]?.color,
                  opacity: loggingOutcome ? 0.6 : 1, transition: 'opacity 0.15s',
                }}>
                {loggingOutcome === lead.slug + outcome ? '...' : OUTCOME_STYLE[outcome]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Callback */}
        <div style={{ marginBottom: feedbackMsg ? 12 : 0 }}>
          {!showCbPicker ? (
            <button onClick={onToggleCbPicker} style={{
              background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            }}>
              📅 Schedule Callback
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={cbDate} onChange={e => onCbDateChange(e.target.value)} min={today()}
                style={{ padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.88rem', color: '#111827' }} />
              <button onClick={() => onLogCall('callback')} disabled={!cbDate || !!loggingOutcome}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', opacity: cbDate ? 1 : 0.5 }}>
                {loggingOutcome ? 'Logging...' : 'Log Callback'}
              </button>
              <button onClick={onToggleCbPicker} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedbackMsg && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: feedbackMsg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: feedbackMsg.startsWith('Error') ? '#dc2626' : '#065f46' }}>
            {feedbackMsg}
          </div>
        )}

        {/* Footer links */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
          <button onClick={onOpenScript} style={{ background: 'none', border: 'none', color: '#c8913a', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}>
            📋 View Script
          </button>
          <button onClick={onToggleHistory} style={{ background: 'none', border: 'none', color: '#6b7280', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}>
            🕐 Call History{lead.callCount > 0 ? ` (${lead.callCount})` : ''}
          </button>
          {lead.nextCallbackDate && (
            <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 'auto' }}>
              Next callback: {fmtDate(lead.nextCallbackDate)}
            </span>
          )}
        </div>

        {/* Call history panel */}
        {historyOpen && (
          <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
            {historyLogs.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>No call history yet.</p>
            ) : historyLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f9fafb' }}>
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: OUTCOME_STYLE[log.outcome]?.color || '#374151' }}>
                    {OUTCOME_STYLE[log.outcome]?.label || log.outcome}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {fmtDate(log.called_at.split('T')[0])} · {fmtTime(log.called_at)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  {log.notes && <p style={{ margin: 0, fontSize: '0.82rem', color: '#374151' }}>{log.notes}</p>}
                  {log.callback_date && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#2563eb' }}>📅 Callback: {fmtDate(log.callback_date)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Script Modal ─────────────────────────────────────────────────────────────

function ScriptModal({ lead, onClose }: { lead: CallerLead; onClose: () => void }) {
  const script = getScript(lead.templateName)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', padding: '0 0 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>

        {/* Modal header */}
        <div style={{ position: 'sticky', top: 0, background: '#111827', color: '#fff', padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>📋 Call Script</div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>{lead.name} · {script.label}</div>
          </div>
          <button onClick={onClose} style={{ background: '#374151', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            Close ✕
          </button>
        </div>

        <div style={{ padding: '20px 20px 0' }}>

          {/* Opening */}
          <Section title="📞 Opening" color="#059669" bg="#ecfdf5">
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: '#111827', whiteSpace: 'pre-line' }}>
              {script.opening.replace('[Business Name]', lead.name)}
            </p>
          </Section>

          {/* Value props */}
          <Section title="✅ Key Selling Points" color="#2563eb" bg="#eff6ff">
            <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
              {script.props.map((p, i) => (
                <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#111827', marginBottom: 4 }}>{p}</li>
              ))}
            </ul>
          </Section>

          {/* Objections */}
          <Section title="🛡 Objections & Responses" color="#d97706" bg="#fffbeb">
            {script.objections.map((obj, i) => (
              <div key={i} style={{ marginBottom: i < script.objections.length - 1 ? 16 : 0 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.88rem', color: '#92400e' }}>{obj.q}</p>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: '#374151' }}>{obj.a}</p>
              </div>
            ))}
          </Section>

          {/* Closing */}
          <Section title="🎯 Closing" color="#7c3aed" bg="#f5f3ff">
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: '#111827' }}>{script.closing}</p>
          </Section>

          {/* Quick ref */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.82rem', color: '#374151' }}>Quick Reference</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: '#374151' }}>
              <span>💰 Setup: <strong>$97</strong></span>
              <span>📅 Monthly: <strong>$49/mo</strong></span>
              <span>⚡ Live: <strong>Today</strong></span>
              <span>🌐 Site: <a href={lead.netlifyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Preview</a></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, bg, children }: { title: string; color: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.82rem', color, letterSpacing: '0.04em' }}>{title}</p>
      {children}
    </div>
  )
}
