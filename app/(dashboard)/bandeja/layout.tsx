export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import ConversationList from '@/components/inbox/ConversationList'
import BandejaShell from '@/components/inbox/BandejaShell'
import type { Conversation, Contact, Label } from '@/types'

export type ConversationWithContact = Conversation & {
  contacts: Contact | null
  conversation_labels: Array<{ label_id: string; labels: Label }>
}

export default async function BandejaLayout({ children }: { children: React.ReactNode }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const supabase = createServiceClient()

  const [{ data: conversations }, { data: labels }, { data: profile }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, contacts(id, phone, name, type, created_at), conversation_labels(label_id, labels(*))')
      .order('last_message_at', { ascending: false, nullsFirst: false }),
    supabase.from('labels').select('*').order('name'),
    supabase.from('user_profiles').select('role').eq('id', user!.id).single(),
  ])

  const role = profile?.role ?? 'atencion'
  const isAdmin = ['owner', 'admin'].includes(role)

  const allConversations = (conversations ?? []) as ConversationWithContact[]
  let visibleConversations = allConversations

  if (!isAdmin) {
    // Obtener grupos del usuario
    const { data: userGroupRows } = await supabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user!.id)

    if (userGroupRows && userGroupRows.length > 0) {
      const groupIds = userGroupRows.map((r) => r.group_id)

      const { data: groupLabelRows } = await supabase
        .from('group_label_access')
        .select('label_id')
        .in('group_id', groupIds)

      const allowedLabelIds = new Set((groupLabelRows ?? []).map((r) => r.label_id))

      if (allowedLabelIds.size > 0) {
        visibleConversations = allConversations.filter((conv) => {
          const convLabelIds = conv.conversation_labels?.map((cl) => cl.label_id) ?? []
          return convLabelIds.some((id) => allowedLabelIds.has(id))
        })
      }
      // Si el grupo no tiene etiquetas asignadas, el usuario no ve nada
      else {
        visibleConversations = []
      }
    }
    // Si no tiene grupos, ve todo (usuario sin restricciones)
  }

  return (
    <BandejaShell
      sidebar={
        <ConversationList
          initialConversations={visibleConversations}
          allLabels={(labels ?? []) as Label[]}
        />
      }
    >
      {children}
    </BandejaShell>
  )
}
