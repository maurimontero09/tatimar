'use client'

import { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { initials } from '@/lib/utils'
import type { Role } from '@prisma/client'

interface TopbarProps {
  user: { name: string; role: Role }
}

export function Topbar({ user }: TopbarProps) {
  const [search, setSearch] = useState('')

  return (
    <header className="h-14 bg-white border-b border-[var(--border)] flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--slate)] border border-[var(--border)]
                      rounded-lg px-3 py-1.5 w-56 focus-within:border-[var(--blue)]
                      focus-within:bg-white transition-all">
        <Search size={14} className="text-[var(--text-3)] shrink-0" style={{ color: 'var(--text-3)' }} />
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative w-8 h-8 rounded-lg flex items-center justify-center
                         text-gray-500 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                      text-blue-700 text-xs font-semibold">
        {initials(user.name)}
      </div>
    </header>
  )
}
