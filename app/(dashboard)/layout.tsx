import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoMark from '@/components/ui/LogoMark'
import LogoutButton from '@/components/ui/LogoutButton'
import BottomNav from '@/components/ui/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-stone-200 bg-white flex items-center px-4 gap-2 shrink-0">
        <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center">
          <LogoMark size={13} color="#fafaf9" />
        </div>
        <span className="text-sm font-semibold text-stone-800">Milpa</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:block text-xs text-stone-400">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
