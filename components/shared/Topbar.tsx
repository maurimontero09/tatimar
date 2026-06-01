'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Bell, Search } from 'lucide-react'
import { initials } from '@/lib/utils'
import type { Role } from '@prisma/client'

interface TopbarProps {
  user: { name: string; role: Role }
  onMenuClick?: () => void
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const [search, setSearch] = useState('')

  return (
    <header className="h-14 bg-white border-b border-[var(--border)] flex items-center px-4 lg:px-6 gap-3 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500
                   hover:bg-gray-100 transition-colors shrink-0"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <span className="flex flex-col gap-1.5">
          <span className="block w-[18px] h-0.5 bg-current rounded" />
          <span className="block w-[18px] h-0.5 bg-current rounded" />
          <span className="block w-[18px] h-0.5 bg-current rounded" />
        </span>
      </button>
      {/* Logo — mobile only, shown when sidebar is hidden */}
      <div className="lg:hidden flex-1 flex justify-center">
        <Image src="/logo.png" alt="Tatimar" width={110} height={38} className="object-contain" />
      </div>

      {/* Search — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 bg-[var(--slate)] border border-[var(--border)]
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

      <div className="hidden lg:block flex-1" />

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
