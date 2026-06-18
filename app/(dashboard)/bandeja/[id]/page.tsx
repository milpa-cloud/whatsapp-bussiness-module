export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import ConversationHeader from '@/components/conversation/ConversationHeader'
import MessageThread from '@/components/conversation/MessageThread'
import MessageInput from '@/components/conversation/MessageInput'
import type { Contact, Message, Label } from '@/types'

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const [{ data: conversation }, { data: messages }, { data: convLabels }, { data: allLabels }] = await Promise.all([
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
    supabase
      .from('conversation_labels')
      .select('label_id')
      .eq('conversation_id', params.id),
    supabase
      .from('labels')
      .select('*')
      .order('name'),
  ])

  if (!conversation) notFound()

  const contact = conversation.contacts as unknown as Contact | null
  const initialLabelIds = (convLabels ?? []).map((r) => r.label_id)

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <ConversationHeader
        conversationId={params.id}
        contact={contact}
        status={conversation.status}
        allLabels={(allLabels ?? []) as Label[]}
        initialLabelIds={initialLabelIds}
      />
      <MessageThread
        conversationId={params.id}
        initialMessages={(messages ?? []) as Message[]}
      />
      <MessageInput conversationId={params.id} />
    </div>
  )
}
