import { MessageSquare } from 'lucide-react'

export default function BandejaPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <MessageSquare size={22} className="text-slate-300" />
      </div>
      <p className="text-sm">Selecciona una conversación para empezar</p>
    </div>
  )
}
