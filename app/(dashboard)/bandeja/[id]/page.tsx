export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    <div className="h-full flex flex-col bg-stone-50">
      <header className="px-4 py-3 border-b border-stone-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/bandeja"
            className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={18} className="text-stone-600" />
          </Link>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-semibold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">{displayName}</p>
            {contact?.name && (
              <p className="text-xs text-stone-400">{contact.phone}</p>
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
