'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, FolderOpen, Users, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/bandeja', label: 'Bandeja', icon: MessageSquare },
  { href: '/proyectos', label: 'Proyectos', icon: FolderOpen },
  { href: '/grupos', label: 'Grupos', icon: Users },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  if (/^\/bandeja\/.+/.test(pathname)) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-stretch z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/bandeja' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-150 ${
              isActive ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
