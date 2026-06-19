'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoMark from '@/components/ui/LogoMark'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/bandeja')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <LogoMark size={16} color="#fafaf9" />
          </div>
          <span className="text-base font-semibold text-stone-900">Milpa</span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <div>
            <h1 className="text-base font-bold text-stone-900">Crear contraseña</h1>
            <p className="text-sm text-stone-400 mt-1">Elige una contraseña para acceder a la bandeja.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 8 caracteres)"
              minLength={8}
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm bg-stone-100 rounded-xl border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
            />

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || password.length < 8}
              className="w-full py-2.5 text-sm font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Guardando…' : 'Entrar a Milpa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
