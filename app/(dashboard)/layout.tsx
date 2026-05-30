import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/shared/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <DashboardShell role={session.user.role} user={session.user}>
      {children}
    </DashboardShell>
  )
}
