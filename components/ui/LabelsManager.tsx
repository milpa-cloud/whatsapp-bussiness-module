'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Label } from '@/types'
import { getLabelColor, LABEL_COLORS } from '@/lib/label-color'

export default function LabelsManager({ initialLabels }: { initialLabels: Label[] }) {
  const [labels, setLabels] = useState(initialLabels)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('emerald')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            return (
              <div key={label.id} className="flex items-center justify-between py-2.5">
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
                  {label.name}
                </span>
                <button
                  onClick={() => handleDelete(label.id, label.name)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                  aria-label={`Eliminar ${label.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Crear nueva etiqueta */}
      <div className="space-y-3 pt-2 border-t border-stone-100">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Nueva etiqueta</p>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
          placeholder="Nombre…"
          className="w-full px-3 py-2 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
        />

        {/* Selector de color */}
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
