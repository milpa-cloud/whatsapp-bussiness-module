import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL('/update-password', request.url))
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'email' | 'signup' | 'magiclink' | 'email_change',
    })
    if (!error) {
      return NextResponse.redirect(new URL('/update-password', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=link_invalido', request.url))
}
