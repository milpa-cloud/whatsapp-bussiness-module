'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    // Supabase detecta automáticamente el access_token en el hash y establece la sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/update-password')
      } else {
        router.replace('/login?error=link_invalido')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-sm text-stone-400">Verificando…</p>
    </div>
  )
}
