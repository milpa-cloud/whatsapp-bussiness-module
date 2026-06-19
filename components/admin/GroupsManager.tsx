'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { getLabelColor } from '@/lib/label-color'
import { getAvatarColor } from '@/lib/avatar-color'
import type { Label } from '@/types'

type GroupEntry = {
  id: string
  name: string
  label_ids: string[]
  user_ids: string[]
}

type UserEntry = {
  id: string
  name: string
  email: string
}

export default function GroupsManager({
  initialGroups,
  allLabels,
  allUsers,
}: {
  initialGroups: GroupEntry[]
  allLabels: Label[]
  allUsers: UserEntry[]
}) {
  const [groups, setGroups] = useState(initialGroups)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const group = await res.json()
      setGroups((prev) => [...prev, group])
      setNewName('')
    }
    setCreating(false)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: editName.trim() } : g)))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar grupo "${name}"?`)) return
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (expandedId === id) setExpandedId(null)
    }
  }

  async function toggleLabel(groupId: string, labelId: string, current: string[]) {
    const isIn = current.includes(labelId)
    const method = isIn ? 'DELETE' : 'POST'
    await fetch(`/api/groups/${groupId}/labels`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_id: labelId }),
    })
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, label_ids: isIn ? g.label_ids.filter((id) => id !== labelId) : [...g.label_ids, labelId] }
          : g
      )
    )
  }

  async function toggleMember(groupId: string, userId: string, current: string[]) {
    const isIn = current.includes(userId)
    const method = isIn ? 'DELETE' : 'POST'
    await fetch(`/api/groups/${groupId}/members`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, user_ids: isIn ? g.user_ids.filter((id) => id !== userId) : [...g.user_ids, userId] }
          : g
      )
    )
  }

  function openGroup(group: GroupEntry) {
    if (expandedId === group.id) {
      setExpandedId(null)
    } else {
      setExpandedId(group.id)
      setEditName(group.name)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-800">Grupos</h3>
        <p className="text-xs text-stone-400 mt-0.5">Controla qué conversaciones ve cada persona</p>
      </div>

      {groups.length === 0 && (
        <p className="px-4 py-4 text-xs text-stone-400">Sin grupos todavía</p>
      )}

      {groups.map((group) => {
        const isOpen = expandedId === group.id
        const groupLabels = allLabels.filter((l) => group.label_ids.includes(l.id))
        const groupUsers = allUsers.filter((u) => group.user_ids.includes(u.id))

        return (
          <div key={group.id}>
            {/* Header del grupo */}
            <button
              onClick={() => openGroup(group)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{group.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {groupLabels.length === 0 && groupUsers.length === 0 && (
                    <span className="text-xs text-stone-400">Sin etiquetas ni miembros</span>
                  )}
                  {groupLabels.map((l) => {
                    const color = getLabelColor(l.color)
                    return (
                      <span key={l.id} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {l.name}
                      </span>
                    )
                  })}
                  {groupUsers.length > 0 && (
                    <span className="text-xs text-stone-400">
                      · {groupUsers.length} {groupUsers.length === 1 ? 'persona' : 'personas'}
                    </span>
                  )}
                </div>
              </div>
              {isOpen ? <ChevronUp size={15} className="text-stone-400 shrink-0" /> : <ChevronDown size={15} className="text-stone-400 shrink-0" />}
            </button>

            {/* Panel de edición */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-stone-100 pt-3 bg-stone-50">
                {/* Nombre */}
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(group.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(group.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-white rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-stone-300 text-stone-800"
                  />
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Etiquetas */}
                {allLabels.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Etiquetas visibles</p>
                    <div className="flex flex-wrap gap-2">
                      {allLabels.map((label) => {
                        const isIn = group.label_ids.includes(label.id)
                        const color = getLabelColor(label.color)
                        return (
                          <button
                            key={label.id}
                            onClick={() => toggleLabel(group.id, label.id, group.label_ids)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                              isIn
                                ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current`
                                : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                            }`}
                          >
                            {isIn && <Check size={10} />}
                            {label.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Miembros */}
                {allUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Miembros</p>
                    <div className="space-y-1">
                      {allUsers.map((user) => {
                        const isIn = group.user_ids.includes(user.id)
                        const avatar = getAvatarColor(user.name || user.email)
                        return (
                          <button
                            key={user.id}
                            onClick={() => toggleMember(group.id, user.id, group.user_ids)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                              isIn ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white border border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatar.bg} ${avatar.text}`}>
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-stone-800 truncate">{user.name || user.email}</p>
                              <p className="text-xs text-stone-400 truncate">{user.email}</p>
                            </div>
                            {isIn && <Check size={14} className="text-emerald-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Crear nuevo grupo */}
      <div className="px-4 py-3 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !creating && handleCreate()}
          placeholder="Nuevo grupo…"
          className="flex-1 px-3 py-1.5 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors shrink-0"
        >
          <Plus size={14} />
          Crear
        </button>
      </div>
    </div>
  )
}
