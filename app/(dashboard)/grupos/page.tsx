import { Users } from 'lucide-react'

export default function GruposPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-stone-50 px-6">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <Users size={20} className="text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600">Grupos</p>
      <p className="text-xs text-stone-400 text-center">
        Conversaciones grupales de WhatsApp. Próximamente.
      </p>
    </div>
  )
}
