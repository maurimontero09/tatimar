'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'
import { can } from '@/lib/permissions'
import { cn, initials } from '@/lib/utils'

interface SidebarProps {
  role: Role
  user: { name: string; email: string }
}

interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number | string
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',       icon: '⊞', roles: ['SUPER_ADMIN','MANAGER','ACCOUNTANT','CLEANER'] },
  { label: 'Schedule',        href: '/schedule',        icon: '📅', roles: ['SUPER_ADMIN','MANAGER'] },
  { label: 'Clients',         href: '/clients',         icon: '🏢', roles: ['SUPER_ADMIN','MANAGER'] },
  { label: 'Employees',       href: '/employees',       icon: '👥', roles: ['SUPER_ADMIN','MANAGER'] },
  { label: 'Payroll',         href: '/payroll',         icon: '💳', roles: ['SUPER_ADMIN','ACCOUNTANT'] },
  { label: 'Reports',         href: '/reports',         icon: '📊', roles: ['SUPER_ADMIN','ACCOUNTANT','MANAGER'] },
  { label: 'Certifications',  href: '/certifications',  icon: '🎖️', roles: ['SUPER_ADMIN','MANAGER'] },
  { label: 'Settings',        href: '/settings',        icon: '⚙️', roles: ['SUPER_ADMIN'] },
  // Cleaner-only
  { label: 'My Schedule',     href: '/cleaner',         icon: '📋', roles: ['CLEANER'] },
  { label: 'My Certifications', href: '/my-certifications', icon: '🎖️', roles: ['CLEANER'] },
]

export function Sidebar({ role, user }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  const roleBadgeLabel: Record<Role, string> = {
    SUPER_ADMIN: 'Admin',
    MANAGER:     'Manager',
    ACCOUNTANT:  'Finance',
    CLEANER:     'Cleaner',
  }

  return (
    <nav className="w-[230px] h-full flex-shrink-0 flex flex-col overflow-y-auto"
         style={{ background: 'var(--navy)' }}>

      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/7 flex items-center">
        <img src="/logo.png" alt="Tatimar Corporate Services" width={150}
             className="object-contain" />
      </div>

      {/* User info */}
      <div className="mx-3.5 my-3 bg-white/6 rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--blue)] flex items-center justify-center
                        text-white text-[10px] font-semibold shrink-0">
          {initials(user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{user.name}</div>
          <div className="text-white/35 text-[10px] truncate">{user.email}</div>
        </div>
        <div className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-600/40 text-blue-300
                        shrink-0 uppercase tracking-wide">
          {roleBadgeLabel[role]}
        </div>
      </div>

      {/* Nav items */}
      <div className="px-3.5 flex-1">
        {visibleItems.map(item => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              'nav-item mb-0.5',
              pathname.startsWith(item.href) && 'active'
            )}>
              <span className="text-base w-[18px]">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-red-500 text-white
                                 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-white/7">
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] shrink-0 animate-pulse" />
          Notion synced · just now
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full text-left mt-1"
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </nav>
  )
}
