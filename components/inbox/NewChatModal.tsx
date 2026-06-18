'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function NewChatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), name: name.trim() || undefined }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al crear conversación')
      setLoading(false)
      return
    }

    const { conversationId } = await res.json()
    onCreated(conversationId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-stone-800">Nuevo chat</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Número de WhatsApp
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="521XXXXXXXXXX"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:border-stone-900 outline-none transition-colors placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-400 mt-1">Con código de país, sin + (ej: 521XXXXXXXXXX)</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Nombre <span className="text-stone-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del contacto"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:border-stone-900 outline-none transition-colors placeholder:text-stone-400"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed text-stone-50 text-sm font-semibold py-2.5 rounded-full transition-colors duration-150 mt-1"
          >
            {loading ? 'Creando…' : 'Crear conversación'}
          </button>
        </form>
      </div>
    </div>
  )
}
