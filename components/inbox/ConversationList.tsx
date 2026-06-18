'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ConversationWithContact } from '@/app/(dashboard)/bandeja/layout'
import type { Label } from '@/types'
import { getLabelColor } from '@/lib/label-color'
import ConversationItem from './ConversationItem'
import NewChatModal from './NewChatModal'

export default function ConversationList({
  initialConversations,
  allLabels,
}: {
  initialConversations: ConversationWithContact[]
  allLabels: Label[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState<string | null>(null) // null = todos
  const [showArchived, setShowArchived] = useState(false)
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
          const { data } = await supabase
            .from('conversations')
            .select('*, contacts(id, phone, name, type, created_at), conversation_labels(label_id, labels(*))')
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
      if (showArchived) return c.status === 'archived'
      if (c.status !== 'active') return false
      if (labelFilter) {
        const labelIds = c.conversation_labels?.map((cl) => cl.label_id) ?? []
        return labelIds.includes(labelFilter)
      }
      return true
    })
    .filter((c) => {
      if (!search) return true
      const name = c.contacts?.name?.toLowerCase() ?? ''
      const phone = c.contacts?.phone ?? ''
      return name.includes(search.toLowerCase()) || phone.includes(search)
    })

  const archivedCount = conversations.filter((c) => c.status === 'archived').length

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

        {/* Filtros por etiqueta */}
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            onClick={() => { setLabelFilter(null); setShowArchived(false) }}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors duration-150 ${
              !labelFilter && !showArchived
                ? 'bg-stone-900 text-stone-50'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            Todos
          </button>

          {allLabels.map((label) => {
            const color = getLabelColor(label.color)
            const isActive = labelFilter === label.id && !showArchived
            return (
              <button
                key={label.id}
                onClick={() => { setLabelFilter(label.id); setShowArchived(false) }}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors duration-150 ${
                  isActive ? `${color.bg} ${color.text}` : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {label.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-stone-400 px-4 py-6 text-center">
            {search ? 'Sin resultados' : showArchived ? 'Sin archivados' : 'Sin conversaciones'}
          </p>
        ) : (
          filtered.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} allLabels={allLabels} />
          ))
        )}

        {/* Archivados */}
        {!search && (
          <button
            onClick={() => { setShowArchived((v) => !v); setLabelFilter(null) }}
            className={`w-full flex items-center gap-2 px-4 py-3 text-xs transition-colors border-t border-stone-100 ${
              showArchived
                ? 'text-stone-700 font-medium bg-stone-50'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Archive size={13} />
            Archivados
            {archivedCount > 0 && (
              <span className="ml-auto text-stone-400 font-normal">{archivedCount}</span>
            )}
          </button>
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
