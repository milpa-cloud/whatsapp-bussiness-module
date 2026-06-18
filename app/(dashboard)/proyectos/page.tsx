import { FolderOpen } from 'lucide-react'

export default function ProyectosPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-stone-50 px-6">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <FolderOpen size={20} className="text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600">Proyectos</p>
      <p className="text-xs text-stone-400 text-center">
        Gestión de proyectos y seguimiento de pedidos. Próximamente.
      </p>
    </div>
  )
}
