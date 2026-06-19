export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import UsersManager from '@/components/admin/UsersManager'
import LabelsManager from '@/components/ui/LabelsManager'
import RoleAccessManager from '@/components/ui/RoleAccessManager'
import type { Label } from '@/types'

export default async function AdminPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'admin'].includes(profile?.role ?? '')) redirect('/bandeja')

  const [{ data: { users } }, { data: profiles }, { data: labels }, { data: roleAccessRows }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('user_profiles').select('id, name, role'),
    supabase.from('labels').select('*').order('name'),
    supabase.from('role_label_access').select('role, label_id'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    name: profileMap[u.id]?.name ?? u.email ?? '',
    role: profileMap[u.id]?.role ?? 'atencion',
    invited_at: u.invited_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))

  const roleAccess: Record<string, string[]> = {}
  for (const row of roleAccessRows ?? []) {
    if (!roleAccess[row.role]) roleAccess[row.role] = []
    roleAccess[row.role].push(row.label_id)
  }

  return (
    <div className="h-full overflow-y-auto bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Administración</h1>
          <p className="text-sm text-stone-400 mt-0.5">Equipo, etiquetas y permisos</p>
        </div>

        <UsersManager initialUsers={userList} currentUserId={user.id} />

        <LabelsManager initialLabels={(labels ?? []) as Label[]} />

        <RoleAccessManager
          initialAccess={roleAccess}
          allLabels={(labels ?? []) as Label[]}
        />
      </div>
    </div>
  )
}
