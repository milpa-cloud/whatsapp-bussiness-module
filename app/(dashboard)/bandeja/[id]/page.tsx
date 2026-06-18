import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import MessageThread from '@/components/conversation/MessageThread'
import MessageInput from '@/components/conversation/MessageInput'
import type { Contact, Message } from '@/types'

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, contacts(id, phone, name, type, created_at)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!conversation) notFound()

  const contact = conversation.contacts as unknown as Contact | null
  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <header className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{displayName}</p>
            {contact?.name && (
              <p className="text-xs text-slate-400">{contact.phone}</p>
            )}
          </div>
        </div>
      </header>
      <MessageThread
        conversationId={params.id}
        initialMessages={(messages ?? []) as Message[]}
      />
      <MessageInput conversationId={params.id} />
    </div>
  )
}
