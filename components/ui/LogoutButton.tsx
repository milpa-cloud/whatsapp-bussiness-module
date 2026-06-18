'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors duration-150"
      aria-label="Cerrar sesión"
    >
      <LogOut size={14} />
      <span>Salir</span>
    </button>
  )
}
