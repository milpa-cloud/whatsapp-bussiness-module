export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import ConversationList from '@/components/inbox/ConversationList'
import BandejaShell from '@/components/inbox/BandejaShell'
import type { Conversation, Contact } from '@/types'

export type ConversationWithContact = Conversation & { contacts: Contact | null }

export default async function BandejaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServiceClient()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, contacts(id, phone, name, type, created_at)')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  return (
    <BandejaShell
      sidebar={
        <ConversationList initialConversations={(conversations ?? []) as ConversationWithContact[]} />
      }
    >
      {children}
    </BandejaShell>
  )
}
