export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import UsersManager from '@/components/admin/UsersManager'
import GroupsManager from '@/components/admin/GroupsManager'
import LabelsManager from '@/components/ui/LabelsManager'
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

  const [
    { data: { users } },
    { data: profiles },
    { data: labels },
    { data: groups },
    { data: gla },
    { data: ug },
  ] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('user_profiles').select('id, name, role'),
    supabase.from('labels').select('*').order('name'),
    supabase.from('groups').select('*').order('name'),
    supabase.from('group_label_access').select('group_id, label_id'),
    supabase.from('user_groups').select('group_id, user_id'),
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

  const groupList = (groups ?? []).map((g) => ({
    ...g,
    label_ids: (gla ?? []).filter((r) => r.group_id === g.id).map((r) => r.label_id),
    user_ids: (ug ?? []).filter((r) => r.group_id === g.id).map((r) => r.user_id),
  }))

  const allUsers = userList.map((u) => ({ id: u.id, name: u.name, email: u.email }))

  return (
    <div className="h-full overflow-y-auto bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Administración</h1>
          <p className="text-sm text-stone-400 mt-0.5">Equipo, grupos, etiquetas y permisos</p>
        </div>

        <UsersManager initialUsers={userList} currentUserId={user.id} />

        <GroupsManager
          initialGroups={groupList}
          allLabels={(labels ?? []) as Label[]}
          allUsers={allUsers}
        />

        <LabelsManager initialLabels={(labels ?? []) as Label[]} />
      </div>
    </div>
  )
}
