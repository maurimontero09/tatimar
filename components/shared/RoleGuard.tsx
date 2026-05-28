import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: string
}

export async function RoleGuard({ children, allowedRoles, fallback = '/dashboard' }: RoleGuardProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!allowedRoles.includes(session.user.role)) redirect(fallback)
  return <>{children}</>
}
