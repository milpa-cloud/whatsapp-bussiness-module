'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function BandejaShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const isConversationOpen = pathname !== '/bandeja'

  return (
    <div className="flex h-full">
      <aside
        className={`border-r border-stone-200 bg-white flex-col shrink-0 w-full md:w-72 ${
          isConversationOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {sidebar}
      </aside>
      <section
        className={`flex-1 overflow-hidden flex-col ${
          isConversationOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {children}
      </section>
    </div>
  )
}
