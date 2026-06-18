import { MessageSquare } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-2 shrink-0">
        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <MessageSquare size={13} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-800">Taller</span>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-500">Carpintería Huayapam</span>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
