export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { User, Bell, Palette, LogOut } from 'lucide-react'
import LogoMark from '@/components/ui/LogoMark'
import LogoutButton from '@/components/ui/LogoutButton'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const roleLabel: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    taller: 'Taller',
    atencion: 'Atención',
  }

  return (
    <div className="h-full overflow-y-auto bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Avatar + info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center shrink-0">
            <LogoMark size={22} color="#fafaf9" />
          </div>
          <div>
            <p className="text-base font-semibold text-stone-900">
              {profile?.name ?? user.email}
            </p>
            <p className="text-sm text-stone-400">{user.email}</p>
            {profile?.role && (
              <span className="inline-block mt-1 text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                {roleLabel[profile.role] ?? profile.role}
              </span>
            )}
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
          <SettingRow icon={Bell} label="Notificaciones" description="Próximamente" disabled />
          <SettingRow icon={Palette} label="Apariencia" description="Próximamente" disabled />
        </div>

        {/* Cerrar sesión */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut size={15} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-stone-800">Cerrar sesión</span>
          </div>
          <LogoutButton />
        </div>

        <p className="text-center text-xs text-stone-300 pb-4">
          Milpa · v0.1
        </p>
      </div>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  description,
  disabled,
}: {
  icon: React.ElementType
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-stone-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {description && <p className="text-xs text-stone-400">{description}</p>}
      </div>
    </div>
  )
}
