import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { CleanerView } from './CleanerView'
import { startOfDay, endOfDay } from 'date-fns'

export default async function CleanerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['CLEANER','SUPER_ADMIN'].includes(session.user.role)) redirect('/dashboard')

  const today = new Date()
  // ±1 day buffer handles UTC vs cleaner's local timezone (e.g. UTC-3 at 11pm still shows "today")
  const from  = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
  const to    = endOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000))

  const schedules = await prisma.schedule.findMany({
    where: {
      date: { gte: from, lte: to },
      status: { not: 'CANCELLED' },
      assignments: { some: { userId: session.user.id } },
    },
    include: {
      client: true,
      location: true,
      assignments: { include: { user: true } },
      clockEvents: { orderBy: { timestamp: 'asc' } },
      completionPhotos: true,
    },
    orderBy: { startTime: 'asc' },
  }).catch(() => [])

  const certifications = await prisma.userCertification.findMany({
    where: { userId: session.user.id },
    include: { certification: true },
    orderBy: { expiresAt: 'asc' },
  }).catch(() => [])

  return <CleanerView schedules={schedules} certifications={certifications} user={session.user} />
}
