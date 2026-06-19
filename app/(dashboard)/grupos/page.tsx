export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import InternalChat from '@/components/chat/InternalChat'

export default async function GruposPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createServiceClient()

  const [
    { data: channels },
    { data: profile },
    { data: { users } },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('internal_channels').select('*, internal_channel_members(user_id)').order('created_at'),
    supabase.from('user_profiles').select('name').eq('id', user.id).single(),
    supabase.auth.admin.listUsers(),
    supabase.from('user_profiles').select('id, name'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  const allUsers = (users ?? []).map((u) => ({
    id: u.id,
    name: profileMap[u.id]?.name ?? u.email ?? '',
    email: u.email ?? '',
  }))

  return (
    <InternalChat
      initialChannels={channels ?? []}
      currentUserId={user.id}
      currentUserName={profile?.name ?? user.email ?? 'Yo'}
      allUsers={allUsers}
    />
  )
}
