'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAvatarColor } from '@/lib/avatar-color'
import { Send, Plus, Hash, X } from 'lucide-react'

type Channel = {
  id: string
  name: string
  created_by: string
  internal_channel_members: { user_id: string }[]
}

type Message = {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
  user_profiles: { name: string } | null
}

type UserEntry = { id: string; name: string; email: string }

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function InternalChat({
  initialChannels,
  currentUserId,
  currentUserName,
  allUsers,
}: {
  initialChannels: Channel[]
  currentUserId: string
  currentUserName: string
  allUsers: UserEntry[]
}) {
  const [channels, setChannels] = useState(initialChannels)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannels[0]?.id ?? null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const activeChannel = channels.find((c) => c.id === activeChannelId)

  // Cargar mensajes cuando cambia el canal
  useEffect(() => {
    if (!activeChannelId) return
    setMessages([])
    fetch(`/api/channels/${activeChannelId}/messages`)
      .then((r) => r.json())
      .then(setMessages)
  }, [activeChannelId])

  // Realtime
  useEffect(() => {
    if (!activeChannelId) return

    const channel = supabase
      .channel(`internal:${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const msg = payload.new as Message
          if (msg.user_id === currentUserId) return // ya lo agregamos optimistamente
          // Buscar nombre del autor
          const author = allUsers.find((u) => u.id === msg.user_id)
          setMessages((prev) => [
            ...prev,
            { ...msg, user_profiles: { name: author?.name ?? 'Equipo' } },
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChannelId, currentUserId, allUsers, supabase])

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !activeChannelId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    // Optimista
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      channel_id: activeChannelId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      user_profiles: { name: currentUserName },
    }
    setMessages((prev) => [...prev, optimistic])

    await fetch(`/api/channels/${activeChannelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setSending(false)
  }

  async function createChannel() {
    if (!newChannelName.trim() || creating) return
    setCreating(true)
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChannelName, memberIds: newChannelMembers }),
    })
    if (res.ok) {
      const channel = await res.json()
      const full = { ...channel, internal_channel_members: [{ user_id: currentUserId }, ...newChannelMembers.map((id) => ({ user_id: id }))] }
      setChannels((prev) => [...prev, full])
      setActiveChannelId(channel.id)
      setShowNewChannel(false)
      setNewChannelName('')
      setNewChannelMembers([])
    }
    setCreating(false)
  }

  // Agrupar mensajes por fecha
  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar canales */}
      <div className={`${activeChannelId ? 'hidden md:flex' : 'flex'} w-full md:w-64 shrink-0 border-r border-stone-200 bg-white flex-col`}>
        <div className="h-12 border-b border-stone-100 flex items-center justify-between px-4">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Canales</span>
          <button
            onClick={() => setShowNewChannel(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 && (
            <p className="text-xs text-stone-400 px-4 py-3">No hay canales aún.</p>
          )}
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                ch.id === activeChannelId
                  ? 'bg-stone-100 text-stone-900 font-medium'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Hash size={14} className="text-stone-400 shrink-0" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className={`${activeChannelId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {activeChannel ? (
          <>
            {/* Header */}
            <div className="h-12 border-b border-stone-200 bg-white flex items-center px-4 gap-2 shrink-0">
              <button
                onClick={() => setActiveChannelId(null)}
                className="md:hidden mr-1 text-stone-400 hover:text-stone-700"
              >
                ←
              </button>
              <Hash size={15} className="text-stone-400" />
              <span className="text-sm font-semibold text-stone-800">{activeChannel.name}</span>
              <span className="text-xs text-stone-400 ml-1">
                {activeChannel.internal_channel_members.length} miembro{activeChannel.internal_channel_members.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-stone-50">
              {grouped.map(({ date, messages: dayMsgs }) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400 shrink-0">{date}</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>
                  <div className="space-y-3">
                    {dayMsgs.map((msg) => {
                      const isMe = msg.user_id === currentUserId
                      const name = msg.user_profiles?.name ?? 'Equipo'
                      const avatar = getAvatarColor(name)

                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatar.bg} ${avatar.text}`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {!isMe && (
                              <span className="text-xs text-stone-400 px-1">{name}</span>
                            )}
                            <div className={`px-3 py-2 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-stone-900 text-white rounded-tr-sm'
                                : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm'
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-xs text-stone-300 px-1">{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-stone-200 bg-white px-4 py-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Mensaje en #${activeChannel.name}`}
                  className="flex-1 bg-stone-100 rounded-full px-4 py-2 text-sm outline-none placeholder:text-stone-400 text-stone-800"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Hash size={32} className="text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">Selecciona un canal o crea uno nuevo</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo canal */}
      {showNewChannel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Nuevo canal</h3>
              <button onClick={() => setShowNewChannel(false)} className="text-stone-400 hover:text-stone-600">
                <X size={16} />
              </button>
            </div>

            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Nombre del canal"
              onKeyDown={(e) => e.key === 'Enter' && createChannel()}
              className="w-full px-3 py-2.5 text-sm bg-stone-100 rounded-xl border-0 outline-none placeholder:text-stone-400 text-stone-800"
            />

            <div>
              <p className="text-xs font-medium text-stone-500 mb-2">Miembros</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allUsers.filter((u) => u.id !== currentUserId).map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 px-1 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newChannelMembers.includes(u.id)}
                      onChange={(e) => {
                        setNewChannelMembers((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                        )
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-700">{u.name}</span>
                    <span className="text-xs text-stone-400 truncate">{u.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={createChannel}
              disabled={!newChannelName.trim() || creating}
              className="w-full py-2.5 text-sm font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-colors"
            >
              {creating ? 'Creando…' : 'Crear canal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
