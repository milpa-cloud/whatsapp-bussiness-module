'use client'

import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ConversationWithContact } from '@/app/(dashboard)/bandeja/layout'
import type { Label } from '@/types'
import ConversationItem from './ConversationItem'
import NewChatModal from './NewChatModal'

type Filter = 'all' | 'bot' | 'human' | 'archived'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'human', label: 'Humano' },
  { id: 'bot', label: 'Bot' },
  { id: 'archived', label: 'Archivados' },
]

export default function ConversationList({
  initialConversations,
  allLabels,
}: {
  initialConversations: ConversationWithContact[]
  allLabels: Label[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showNewChat, setShowNewChat] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime:conversations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) =>
            prev
              .map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
              .sort((a, b) => {
                const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
                const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
                return bTime - aTime
              })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        async (payload) => {
          // Fetch the new conversation with its contact
          const { data } = await supabase
            .from('conversations')
            .select('*, contacts(id, phone, name, type, created_at)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setConversations((prev) => [data as ConversationWithContact, ...prev])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const filtered = conversations
    .filter((c) => {
      if (filter === 'archived') return c.status === 'archived'
      if (filter === 'bot') return c.status === 'active' && c.mode === 'bot'
      if (filter === 'human') return c.status === 'active' && c.mode === 'human'
      return c.status === 'active'
    })
    .filter((c) => {
      if (!search) return true
      const name = c.contacts?.name?.toLowerCase() ?? ''
      const phone = c.contacts?.phone ?? ''
      return name.includes(search.toLowerCase()) || phone.includes(search)
    })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-stone-100 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest uppercase text-emerald-600">
            Bandeja
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors duration-150"
            aria-label="Nuevo chat"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:bg-stone-50 focus:ring-1 focus:ring-stone-300 transition-colors placeholder:text-stone-400 text-stone-800"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors duration-150 ${
                filter === id
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-stone-400 px-4 py-6 text-center">
            {search ? 'Sin resultados' : 'Sin conversaciones'}
          </p>
        ) : (
          filtered.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} allLabels={allLabels} />
          ))
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={(id) => {
            setShowNewChat(false)
            window.location.href = `/bandeja/${id}`
          }}
        />
      )}
    </div>
  )
}
