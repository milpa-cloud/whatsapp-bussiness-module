export const LABEL_COLORS = [
  { key: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  { key: 'sky',     bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  { key: 'violet',  bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  { key: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  { key: 'orange',  bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  { key: 'teal',    bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
  { key: 'indigo',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  { key: 'stone',   bg: 'bg-stone-100',   text: 'text-stone-600',   dot: 'bg-stone-400'   },
]

export function getLabelColor(colorKey: string) {
  return LABEL_COLORS.find((c) => c.key === colorKey) ?? LABEL_COLORS[LABEL_COLORS.length - 1]
}
