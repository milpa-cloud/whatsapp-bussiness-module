'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Label } from '@/types'
import { getLabelColor } from '@/lib/label-color'

const CONFIGURABLE_ROLES: { key: string; label: string }[] = [
  { key: 'taller',   label: 'Taller'    },
  { key: 'atencion', label: 'Atención'  },
]

type RoleAccess = Record<string, string[]>

export default function RoleAccessManager({
  initialAccess,
  allLabels,
}: {
  initialAccess: RoleAccess
  allLabels: Label[]
}) {
  const [access, setAccess] = useState(initialAccess)

  async function toggle(role: string, labelId: string) {
    const current = access[role] ?? []
    const isEnabled = current.includes(labelId)
    setAccess((prev) => ({
      ...prev,
      [role]: isEnabled
        ? (prev[role] ?? []).filter((id) => id !== labelId)
        : [...(prev[role] ?? []), labelId],
    }))
    await fetch('/api/role-label-access', {
      method: isEnabled ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, label_id: labelId }),
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-stone-800">Permisos por rol</h3>
        <p className="text-xs text-stone-400 mt-0.5">
          Sin etiquetas activas el rol ve todas las conversaciones.
        </p>
      </div>

      {allLabels.length === 0 && (
        <p className="text-xs text-stone-400">Crea etiquetas primero para configurar permisos.</p>
      )}

      {CONFIGURABLE_ROLES.map(({ key, label }) => {
        const enabledIds = access[key] ?? []
        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">{label}</p>
            {allLabels.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {allLabels.map((l) => {
                    const enabled = enabledIds.includes(l.id)
                    const color = getLabelColor(l.color)
                    return (
                      <button
                        key={l.id}
                        onClick={() => toggle(key, l.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          enabled
                            ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current`
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                      >
                        {enabled && <Check size={12} />}
                        {l.name}
                      </button>
                    )
                  })}
                </div>
                {enabledIds.length === 0 && (
                  <p className="text-xs text-stone-400">Ve todas las conversaciones</p>
                )}
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
