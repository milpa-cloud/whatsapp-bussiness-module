export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import LogoMark from '@/components/ui/LogoMark'
import LogoutButton from '@/components/ui/LogoutButton'
import BottomNav from '@/components/ui/BottomNav'
import TopNav from '@/components/ui/TopNav'
import PushSubscriber from '@/components/ui/PushSubscriber'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = ['owner', 'admin'].includes(profile?.role ?? '')

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-stone-200 bg-white flex items-center px-4 gap-3 shrink-0">
        <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center shrink-0">
          <LogoMark size={13} color="#fafaf9" />
        </div>
        <span className="text-sm font-semibold text-stone-800 shrink-0">Milpa</span>

        {/* Nav desktop */}
        <TopNav isAdmin={isAdmin} />

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="hidden md:block text-xs text-stone-400">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
      <PushSubscriber />
    </div>
  )
}
