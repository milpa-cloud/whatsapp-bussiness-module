'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { SendHorizonal } from 'lucide-react'

export default function MessageInput({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    const text = content.trim()
    if (!text || sending) return

    setSending(true)
    setContent('')

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, content: text }),
      })
      if (!res.ok) throw new Error('Error al enviar')
    } catch (err) {
      console.error(err)
      setContent(text)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  return (
    <div className="px-4 py-3 border-t border-stone-200 bg-white flex items-end gap-2 shrink-0">
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje… (Enter para enviar)"
        disabled={sending}
        className="flex-1 resize-none rounded-2xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 disabled:opacity-50 leading-relaxed transition-colors duration-150"
        style={{ minHeight: '44px', maxHeight: '128px' }}
      />
      <button
        onClick={handleSend}
        disabled={!content.trim() || sending}
        className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors duration-150 shrink-0"
        aria-label="Enviar mensaje"
      >
        <SendHorizonal size={16} className="text-white" />
      </button>
    </div>
  )
}
