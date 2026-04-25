export default function LandingPage() {
  return (
    <div style={s.page}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <span style={s.logo}>MariettaWebsites</span>
          <a href="/login" style={s.navLogin}>Admin Login</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <p style={s.heroLabel}>Local Business Websites · Marietta, GA</p>
          <h1 style={s.heroH1}>Your business deserves to be found online.</h1>
          <p style={s.heroSub}>
            We build fast, professional websites for local businesses — restaurants, salons, contractors, and more.
            Up and running in 24 hours. No tech headaches. No long-term contracts.
          </p>
          <a href="tel:+17709999999" style={s.heroCta}>Call Us Today</a>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={s.section}>
        <div style={s.inner}>
          <p style={s.sectionLabel}>What's Included</p>
          <h2 style={s.h2}>Everything handled for you.</h2>
          <div style={s.cardGrid}>
            {[
              { icon: '⚡', title: 'Up in 24 Hours', body: 'We handle the whole build. You get a live, professional site with your info, hours, and Google reviews — ready the next day.' },
              { icon: '📍', title: 'Local SEO Ready', body: 'Your site is built to show up in Google searches for your area. We connect it to your Google Business Profile to boost your visibility.' },
              { icon: '⭐', title: 'Auto-Synced Reviews', body: 'Your Google reviews automatically show up on your site and stay updated. Fresh reviews build trust with every visitor.' },
              { icon: '📱', title: 'Looks Great on Phone', body: 'Most of your customers will visit on their phone. Your site is designed mobile-first so it always looks sharp.' },
              { icon: '✏️', title: 'Easy Updates', body: 'Need to change your hours? Update a phone number? We handle it fast — usually same day.' },
              { icon: '💳', title: 'Simple, Flat Pricing', body: 'No surprises. One setup fee, one monthly rate. No upsells, no hidden costs.' },
            ].map(card => (
              <div key={card.title} style={s.card}>
                <span style={s.cardIcon}>{card.icon}</span>
                <h3 style={s.cardTitle}>{card.title}</h3>
                <p style={s.cardBody}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ ...s.section, background: '#1a1a1a' }}>
        <div style={s.inner}>
          <p style={{ ...s.sectionLabel, color: '#c8913a' }}>Pricing</p>
          <h2 style={{ ...s.h2, color: '#fff' }}>Straightforward. No surprises.</h2>
          <div style={s.pricingGrid}>
            <div style={s.pricingCard}>
              <p style={s.pricingLabel}>One-Time Setup</p>
              <p style={s.pricingAmount}>$100</p>
              <p style={s.pricingDesc}>We build your site, write the content, connect your reviews, and get it live. Done.</p>
            </div>
            <div style={{ ...s.pricingCard, borderColor: '#c8913a' }}>
              <p style={s.pricingLabel}>Monthly</p>
              <p style={{ ...s.pricingAmount, color: '#c8913a' }}>$50<span style={{ fontSize: '1rem', fontWeight: 400, color: '#999' }}>/mo</span></p>
              <p style={s.pricingDesc}>Hosting, maintenance, review updates, and any changes you need. We keep it running.</p>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', marginTop: 24 }}>
            No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* WHO WE WORK WITH */}
      <section style={s.section}>
        <div style={s.inner}>
          <p style={s.sectionLabel}>Who We Work With</p>
          <h2 style={s.h2}>Built for local businesses.</h2>
          <div style={s.typeGrid}>
            {['Restaurants & Cafes', 'Hair Salons & Spas', 'Electricians & Plumbers', 'Contractors & Roofers', 'Auto Repair Shops', 'Dentists & Clinics', 'Dry Cleaners & Laundry', 'Florists & Boutiques'].map(t => (
              <div key={t} style={s.typeTag}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ ...s.section, background: '#f9fafb', paddingBottom: 80 }}>
        <div style={{ ...s.inner, textAlign: 'center' }}>
          <p style={s.sectionLabel}>Get In Touch</p>
          <h2 style={s.h2}>Ready to get your business online?</h2>
          <p style={{ color: '#6b7280', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Give us a call or send an email. We'll answer your questions and get your site started right away.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:+17709999999" style={s.ctaBtn}>📞 Call Us</a>
            <a href="mailto:michael.matthews3232@gmail.com" style={{ ...s.ctaBtn, background: 'transparent', border: '2px solid #c8913a', color: '#c8913a' }}>✉ Email Us</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span>© {new Date().getFullYear()} MariettaWebsites. All rights reserved.</span>
          <a href="/login" style={{ color: '#666', fontSize: '0.8rem' }}>Admin</a>
        </div>
      </footer>

    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:         { fontFamily: "'Inter', sans-serif", color: '#1a1a1a', background: '#fff' },
  nav:          { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f0ebe3', padding: '16px 24px' },
  navInner:     { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo:         { fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' },
  navLogin:     { fontSize: '0.85rem', color: '#6b7280', textDecoration: 'none', padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6 },

  hero:         { background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f0e 100%)', padding: '100px 24px 110px' },
  heroInner:    { maxWidth: 700, margin: '0 auto' },
  heroLabel:    { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8913a', marginBottom: 20, display: 'block' },
  heroH1:       { fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 24 },
  heroSub:      { fontSize: '1.05rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, marginBottom: 36, maxWidth: 580 },
  heroCta:      { display: 'inline-block', padding: '14px 32px', background: '#c8913a', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' },

  section:      { padding: '80px 24px', background: '#fff' },
  inner:        { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8913a', marginBottom: 12 },
  h2:           { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, marginBottom: 48, lineHeight: 1.2 },

  cardGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 },
  card:         { background: '#faf8f4', borderRadius: 12, padding: '28px 24px', border: '1px solid #f0ebe3' },
  cardIcon:     { fontSize: '1.5rem', display: 'block', marginBottom: 14 },
  cardTitle:    { fontWeight: 700, fontSize: '1rem', marginBottom: 8 },
  cardBody:     { fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.7, margin: 0 },

  pricingGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, maxWidth: 640, margin: '0 auto' },
  pricingCard:  { background: '#222', border: '1px solid #333', borderRadius: 14, padding: '36px 28px', textAlign: 'center' },
  pricingLabel: { fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 12 },
  pricingAmount:{ fontSize: '2.6rem', fontWeight: 700, color: '#fff', marginBottom: 16 },
  pricingDesc:  { fontSize: '0.88rem', color: '#999', lineHeight: 1.7, margin: 0 },

  typeGrid:     { display: 'flex', flexWrap: 'wrap', gap: 10 },
  typeTag:      { padding: '8px 18px', background: '#f3f4f6', borderRadius: 30, fontSize: '0.88rem', fontWeight: 500, color: '#374151' },

  ctaBtn:       { display: 'inline-block', padding: '14px 28px', background: '#c8913a', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' },

  footer:       { background: '#111', padding: '20px 24px' },
  footerInner:  { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' },
}
