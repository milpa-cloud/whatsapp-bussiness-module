'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, FolderOpen, Users, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/bandeja',   label: 'Bandeja',   icon: MessageSquare },
  { href: '/proyectos', label: 'Proyectos', icon: FolderOpen    },
  { href: '/grupos',    label: 'Grupos',    icon: Users         },
  { href: '/perfil',    label: 'Perfil',    icon: User          },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-1 ml-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href === '/bandeja' && pathname.startsWith('/bandeja'))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-stone-900 text-stone-50'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
            }`}
          >
            <Icon size={13} strokeWidth={isActive ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
