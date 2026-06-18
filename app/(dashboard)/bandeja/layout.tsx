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

  // Para roles restringidos, aplicar filtro por etiquetas
  let allowedLabelIds: string[] = []
  if (!isAdmin) {
    const { data: roleAccess } = await supabase
      .from('role_label_access')
      .select('label_id')
      .eq('role', role)
    allowedLabelIds = (roleAccess ?? []).map((r) => r.label_id)
  }

  const allConversations = (conversations ?? []) as ConversationWithContact[]

  // Si hay restricciones configuradas, filtrar conversaciones
  const visibleConversations =
    isAdmin || allowedLabelIds.length === 0
      ? allConversations
      : allConversations.filter((conv) => {
          const convLabelIds = conv.conversation_labels?.map((cl) => cl.label_id) ?? []
          return convLabelIds.some((id) => allowedLabelIds.includes(id))
        })

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
