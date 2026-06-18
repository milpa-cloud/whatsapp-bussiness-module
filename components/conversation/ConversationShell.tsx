'use client'

import { useState } from 'react'
import ConversationHeader from './ConversationHeader'
import MessageThread from './MessageThread'
import MessageInput from './MessageInput'
import type { Contact, Message, Label } from '@/types'

export default function ConversationShell({
  conversationId,
  contact,
  status,
  initialMessages,
  allLabels,
  initialLabelIds,
}: {
  conversationId: string
  contact: Contact | null
  status: string
  initialMessages: Message[]
  allLabels: Label[]
  initialLabelIds: string[]
}) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-full flex flex-col bg-stone-50">
      <ConversationHeader
        conversationId={conversationId}
        contact={contact}
        status={status}
        allLabels={allLabels}
        initialLabelIds={initialLabelIds}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <MessageThread
        conversationId={conversationId}
        initialMessages={initialMessages}
        searchQuery={searchQuery}
      />
      <MessageInput conversationId={conversationId} />
    </div>
  )
}
