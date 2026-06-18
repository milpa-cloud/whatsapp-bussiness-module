import LogoMark from '@/components/ui/LogoMark'

export default function BandejaPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-stone-50">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <LogoMark size={18} color="#a8a29e" />
      </div>
      <p className="text-sm text-stone-400">Selecciona una conversación</p>
    </div>
  )
}
