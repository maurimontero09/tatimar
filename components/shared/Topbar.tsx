'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Search, X } from 'lucide-react'
import { initials } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import type { Role } from '@prisma/client'

interface TopbarProps {
  user: { name: string; role: Role }
  onMenuClick?: () => void
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const [search, setSearch]     = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef                 = useRef<HTMLDivElement>(null)

  const { data: notifications = [], refetch } = trpc.notification.list.useQuery()
  const { data: unreadCount = 0 }             = trpc.notification.unreadCount.useQuery()
  const markRead    = trpc.notification.markRead.useMutation({ onSuccess: () => refetch() })
  const markAllRead = trpc.notification.markAllRead.useMutation({ onSuccess: () => refetch() })

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

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

      {/* Logo — mobile only */}
      <div className="lg:hidden flex-1 flex justify-center">
        <img src="/logo.png" alt="Tatimar" width={110} className="object-contain" />
      </div>

      {/* Search — desktop only */}
      <div className="hidden sm:flex items-center gap-2 bg-[var(--slate)] border border-[var(--border)]
                      rounded-lg px-3 py-1.5 w-56 focus-within:border-[var(--blue)]
                      focus-within:bg-white transition-all">
        <Search size={14} className="text-[var(--text-3)] shrink-0" style={{ color: 'var(--text-3)' }} />
        <input type="text" placeholder="Search…" value={search}
               onChange={e => setSearch(e.target.value)}
               className="bg-transparent border-none outline-none text-sm w-full" />
      </div>

      <div className="hidden lg:block flex-1" />

      {/* Notification bell */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setBellOpen(o => !o)}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center
                     text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white
                             text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {bellOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[var(--border)] z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={() => markAllRead.mutate()}
                          className="text-[11px] text-[var(--blue)] hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id}
                       onClick={() => !n.read && markRead.mutate({ id: n.id })}
                       className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer
                                   hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      !n.read ? 'bg-[var(--blue)]' : 'bg-gray-200'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--navy)] truncate">{n.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {format(new Date(n.createdAt), 'MMM d · HH:mm')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                      text-blue-700 text-xs font-semibold">
        {initials(user.name)}
      </div>
    </header>
  )
}
