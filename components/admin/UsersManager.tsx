'use client'

import { useState } from 'react'
import { Trash2, UserPlus, Mail, Clock } from 'lucide-react'
import { getAvatarColor } from '@/lib/avatar-color'

type UserEntry = {
  id: string
  email: string
  name: string
  role: string
  invited_at: string | null
  last_sign_in_at: string | null
}

const ROLES = [
  { value: 'owner', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'atencion', label: 'Atención' },
  { value: 'taller', label: 'Taller' },
]

const roleBadge: Record<string, string> = {
  owner: 'bg-stone-900 text-stone-50',
  admin: 'bg-emerald-100 text-emerald-700',
  atencion: 'bg-sky-100 text-sky-700',
  taller: 'bg-amber-100 text-amber-700',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserEntry[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('atencion')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    setInviteSent(false)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
    })

    if (res.ok) {
      setInviteSent(true)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('atencion')
      // Refetch users
      const updated = await fetch('/api/users').then((r) => r.json())
      setUsers(updated)
    } else {
      const data = await res.json()
      setInviteError(data.error ?? 'Error al invitar')
    }
    setInviting(false)
  }

  async function handleRoleChange(id: string, role: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a "${name}"? Perderá acceso inmediatamente.`)) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Lista de usuarios */}
      <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-800">Equipo</h3>
          <p className="text-xs text-stone-400 mt-0.5">{users.length} {users.length === 1 ? 'persona' : 'personas'}</p>
        </div>

        {users.map((user) => {
          const avatar = getAvatarColor(user.name || user.email)
          const initial = (user.name || user.email).charAt(0).toUpperCase()
          const isMe = user.id === currentUserId
          const hasSignedIn = !!user.last_sign_in_at

          return (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3">
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatar.bg} ${avatar.text}`}>
                {initial}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-800 truncate">
                    {user.name || user.email}
                    {isMe && <span className="text-stone-400 font-normal"> (tú)</span>}
                  </span>
                  {!hasSignedIn && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                      <Clock size={10} />
                      Pendiente
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 truncate">{user.email}</p>
              </div>

              {/* Rol */}
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                disabled={isMe}
                className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer disabled:cursor-default ${roleBadge[user.role] ?? 'bg-stone-100 text-stone-600'}`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {/* Eliminar */}
              {!isMe && (
                <button
                  onClick={() => handleDelete(user.id, user.name || user.email)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Invitar usuario */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus size={15} className="text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-800">Invitar persona</h3>
        </div>

        <p className="text-xs text-stone-400">
          Le llegará un correo para que cree su contraseña.
        </p>

        <input
          type="text"
          value={inviteName}
          onChange={(e) => setInviteName(e.target.value)}
          placeholder="Nombre"
          className="w-full px-3 py-2 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
        />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !inviting && handleInvite()}
              placeholder="correo@ejemplo.com"
              className="w-full pl-8 pr-3 py-2 text-sm bg-stone-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="text-sm bg-stone-100 rounded-lg px-2 py-2 border-0 outline-none text-stone-700"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
        {inviteSent && <p className="text-xs text-emerald-600">Invitación enviada.</p>}

        <button
          onClick={handleInvite}
          disabled={!inviteEmail.trim() || inviting}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
        >
          <UserPlus size={14} />
          {inviting ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </div>
    </div>
  )
}
