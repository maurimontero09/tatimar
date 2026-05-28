import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { ScheduleCalendar } from './ScheduleCalendar'

export default async function SchedulePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const weekEnd   = endOfWeek(today, { weekStartsOn: 1 })

  const [schedules, cleaners, clients] = await Promise.all([
    prisma.schedule.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: {
        client: true,
        assignments: { include: { user: true } },
        clockEvents: true,
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'CLEANER', isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <ScheduleCalendar
      schedules={JSON.parse(JSON.stringify(schedules))}
      cleaners={JSON.parse(JSON.stringify(cleaners))}
      clients={JSON.parse(JSON.stringify(clients))}
      weekStart={weekStart.toISOString()}
    />
  )
}
