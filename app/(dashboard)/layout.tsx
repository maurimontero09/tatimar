import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { Topbar }  from '@/components/shared/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--slate)]">
      <Sidebar role={session.user.role} user={session.user} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
