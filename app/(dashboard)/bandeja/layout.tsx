export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import ConversationList from '@/components/inbox/ConversationList'
import type { Conversation, Contact } from '@/types'

export type ConversationWithContact = Conversation & { contacts: Contact | null }

export default async function BandejaLayout({ children }: { children: React.ReactNode }) {
  // TODO (Semana 2): reemplazar con createClient() + verificar sesión de usuario
  const supabase = createServiceClient()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, contacts(id, phone, name, type, created_at)')
    .eq('status', 'active')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <ConversationList initialConversations={(conversations ?? []) as ConversationWithContact[]} />
      </aside>
      <section className="flex-1 overflow-hidden flex flex-col">
        {children}
      </section>
    </div>
  )
}
