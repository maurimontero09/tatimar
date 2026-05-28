import { redirect } from 'next/navigation'
import { auth } from '@/server/auth/config'
import { defaultRouteForRole } from '@/lib/permissions'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  redirect(defaultRouteForRole(session.user.role))
}
