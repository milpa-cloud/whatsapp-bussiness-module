import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageSquare, LogOut } from 'lucide-react'
import LogoutButton from '@/components/ui/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-2 shrink-0">
        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <MessageSquare size={13} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-800">Taller</span>
        {process.env.NEXT_PUBLIC_TALLER_NAME && (
          <>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-500">{process.env.NEXT_PUBLIC_TALLER_NAME}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
