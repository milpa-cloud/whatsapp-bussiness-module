'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (!error && data.session) {
          router.replace('/update-password')
        } else {
          router.replace('/login?error=link_invalido')
        }
      })
    } else {
      router.replace('/login?error=link_invalido')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-sm text-stone-400">Verificando…</p>
    </div>
  )
}
