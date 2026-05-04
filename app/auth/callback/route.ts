import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAILS  = (process.env.ADMIN_EMAILS  || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const CALLER_EMAILS = (process.env.CALLER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')

  const response = NextResponse.redirect(`${origin}/dashboard`)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const email = data?.user?.email?.toLowerCase() || ''

    if (ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(`${origin}/admin`, { headers: response.headers })
    }
    if (CALLER_EMAILS.includes(email)) {
      return NextResponse.redirect(`${origin}/caller`, { headers: response.headers })
    }
  }

  return response
}
