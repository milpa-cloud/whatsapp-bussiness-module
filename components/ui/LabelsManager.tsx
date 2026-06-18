'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import type { Label } from '@/types'
import { getLabelColor, LABEL_COLORS } from '@/lib/label-color'

export default function LabelsManager({ initialLabels }: { initialLabels: Label[] }) {
  const [labels, setLabels] = useState(initialLabels)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('emerald')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    if (res.ok) {
      const label: Label = await res.json()
      setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
    } else {
      setError('No se pudo crear la etiqueta')
    }
    setLoading(false)
  }

  function startEdit(label: Label) {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    })
    if (res.ok) {
      const updated: Label = await res.json()
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)))
      cancelEdit()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Se quitará de todas las conversaciones.`)) return
    const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' })
    if (res.ok) setLabels((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-stone-800">Etiquetas</h3>

      {labels.length === 0 ? (
        <p className="text-xs text-stone-400">Sin etiquetas todavía</p>
      ) : (
        <div className="flex flex-col divide-y divide-stone-100">
          {labels.map((label) => {
            const color = getLabelColor(label.color)
            const isEditing = editingId === label.id

            return (
              <div key={label.id} className="py-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit(label.id)}
                      className="flex-1 px-2 py-1 text-sm bg-stone-100 rounded-lg outline-none focus:ring-1 focus:ring-stone-300"
                      autoFocus
                    />
                  ) : (
                    <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
                      {label.name}
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleEdit(label.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(label)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(label.id, label.name)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-wrap gap-2 pl-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setEditColor(c.key)}
                        className={`w-5 h-5 rounded-full ${c.dot} transition-transform ${
                          editColor === c.key
                            ? 'scale-125 ring-2 ring-offset-1 ring-stone-400'
                            : 'hover:scale-110'
                        }`}
                        aria-label={c.key}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Crear nueva */}
      <div className="space-y-3 pt-2 border-t border-stone-100">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Nueva etiqueta</p>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
          placeholder="Nombre…"
          className="w-full px-3 py-2 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
        />

        <div className="flex flex-wrap gap-2">
          {LABEL_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setNewColor(c.key)}
              className={`w-6 h-6 rounded-full ${c.dot} transition-transform ${
                newColor === c.key
                  ? 'scale-125 ring-2 ring-offset-1 ring-stone-400'
                  : 'hover:scale-110'
              }`}
              aria-label={c.key}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!newName.trim() || loading}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
        >
          <Plus size={14} />
          Crear etiqueta
        </button>
      </div>
    </div>
  )
}
