'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>MariettaWebsites</h1>
        <h2 style={styles.heading}>Client Portal</h2>
        <p style={styles.sub}>Enter your email and we'll send you a login link — no password needed.</p>

        {sent ? (
          <div style={styles.success}>
            <p>✓ Check your email for a login link.</p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 8 }}>
              Can't find it? Check your spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Sending...' : 'Send Login Link'}
            </button>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: '0.9rem' }}>
                Error: {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f0e 100%)', padding: 24
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  logo: { fontSize: '1.2rem', fontWeight: 700, color: '#c8913a', margin: '0 0 8px' },
  heading: { fontSize: '1.6rem', fontWeight: 700, margin: '0 0 12px' },
  sub: { color: '#666', fontSize: '0.95rem', margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '14px 16px', fontSize: '1rem', border: '1px solid #e5e7eb',
    borderRadius: 8, outline: 'none', width: '100%'
  },
  btn: {
    padding: '14px', background: '#c8913a', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
  },
  success: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
    padding: 20, color: '#166534'
  }
}
