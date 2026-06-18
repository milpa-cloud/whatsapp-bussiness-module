import { Truck } from 'lucide-react'

export default function ProveedoresPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-stone-50 px-6">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <Truck size={20} className="text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600">Proveedores</p>
      <p className="text-xs text-stone-400 text-center">
        Directorio de proveedores y contactos de taller. Próximamente.
      </p>
    </div>
  )
}
