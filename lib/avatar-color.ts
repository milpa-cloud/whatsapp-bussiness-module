const COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { bg: 'bg-sky-100',     text: 'text-sky-700'     },
  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { bg: 'bg-rose-100',    text: 'text-rose-700'    },
  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
]

export function getAvatarColor(seed: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
