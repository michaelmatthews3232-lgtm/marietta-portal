import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MariettaWebsites Client Portal',
  description: 'Manage your website',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Inter, sans-serif', margin: 0, background: '#f9fafb' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          textarea::placeholder { color: rgba(255,255,255,0.3); }
          button:hover { opacity: 0.88; }
          * { box-sizing: border-box; }
        `}</style>
        {children}
      </body>
    </html>
  )
}
