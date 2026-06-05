import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { sendSms, notifyManagersInApp } from '@/server/notifications'
import { format } from 'date-fns'

const NOTIFY_PHONE = process.env.TWILIO_NOTIFY_PHONE ?? ''

async function buildClockSms(
  type: 'CLOCK_IN' | 'CLOCK_OUT',
  cleanerName: string,
  clientName: string,
  lat?: number | null,
  lng?: number | null,
) {
  const action = type === 'CLOCK_IN' ? 'clock in' : 'clock out'
  const now    = new Date()
  const hour   = format(now, 'HH:mm')
  const date   = format(now, 'MMM d, yyyy')

  // Keep under 160 GSM-7 chars — no emoji (emoji forces UCS-2, limit drops to 70)
  const firstName = cleanerName.split(' ')[0]
  const mapLink   = lat && lng
    ? `maps.google.com/?q=${lat.toFixed(4)},${lng.toFixed(4)}`
    : 'no GPS'
  return `Tatimar | ${firstName} clocked ${action === 'clock in' ? 'IN' : 'OUT'} ${hour} ${date}\nJob: ${clientName}\n${mapLink}`
}

export const clockRouter = createTRPCRouter({
  clockIn: protectedProcedure
    .input(z.object({
      scheduleId: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      accuracy: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx

      // Verify assignment
      const assignment = await prisma.scheduleAssignment.findUnique({
        where: {
          scheduleId_userId: {
            scheduleId: input.scheduleId,
            userId: session.user.id,
          },
        },
      })
      if (!assignment) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this job' })

      // Check not already clocked in
      const lastEvent = await prisma.clockEvent.findFirst({
        where: { scheduleId: input.scheduleId, userId: session.user.id },
        orderBy: { timestamp: 'desc' },
      })
      if (lastEvent?.type === 'CLOCK_IN') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already clocked in' })
      }

      const schedule = await prisma.schedule.findUnique({
        where: { id: input.scheduleId },
        include: { client: true },
      })

      const [event] = await prisma.$transaction([
        prisma.clockEvent.create({
          data: {
            userId:     session.user.id,
            scheduleId: input.scheduleId,
            type:       'CLOCK_IN',
            lat:        input.lat,
            lng:        input.lng,
            accuracy:   input.accuracy,
          },
        }),
        prisma.schedule.update({
          where: { id: input.scheduleId },
          data:  { status: 'IN_PROGRESS' },
        }),
      ])

      // In-app notification for managers (non-blocking)
      const cleaner = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
      const cleanerName = cleaner?.name ?? 'Cleaner'
      const clientName  = schedule?.client?.name ?? 'Unknown'
      notifyManagersInApp(
        `${cleanerName} clocked in`,
        `${clientName} · ${format(new Date(), 'HH:mm')}`
      ).catch(err => console.error('[Notification clock-in]', err))

      // SMS (non-blocking, only if phone configured)
      if (NOTIFY_PHONE) {
        buildClockSms('CLOCK_IN', cleanerName, clientName, input.lat, input.lng)
          .then(msg => sendSms(NOTIFY_PHONE, msg))
          .catch(err => console.error('[SMS clock-in]', err))
      }

      return event
    }),

  clockOut: protectedProcedure
    .input(z.object({
      scheduleId: z.string(),
      lat:        z.number().optional(),
      lng:        z.number().optional(),
      accuracy:   z.number().optional(),
      notes:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx

      const lastEvent = await prisma.clockEvent.findFirst({
        where: { scheduleId: input.scheduleId, userId: session.user.id },
        orderBy: { timestamp: 'desc' },
      })
      if (lastEvent?.type !== 'CLOCK_IN') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Not clocked in' })
      }

      const outEvent = await prisma.clockEvent.create({
        data: {
          userId:     session.user.id,
          scheduleId: input.scheduleId,
          type:       'CLOCK_OUT',
          lat:        input.lat,
          lng:        input.lng,
          accuracy:   input.accuracy,
          notes:      input.notes,
        },
      })

      // In-app notification + SMS (non-blocking)
      const [outCleaner, outSchedule] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        prisma.schedule.findUnique({ where: { id: input.scheduleId }, include: { client: true } }),
      ])
      const outCleanerName = outCleaner?.name ?? 'Cleaner'
      const outClientName  = outSchedule?.client?.name ?? 'Unknown'

      notifyManagersInApp(
        `${outCleanerName} clocked out`,
        `${outClientName} · ${format(new Date(), 'HH:mm')}`
      ).catch(err => console.error('[Notification clock-out]', err))

      if (NOTIFY_PHONE) {
        buildClockSms('CLOCK_OUT', outCleanerName, outClientName, input.lat, input.lng)
          .then(msg => sendSms(NOTIFY_PHONE, msg))
          .catch(err => console.error('[SMS clock-out]', err))
      }

      return outEvent
    }),

  // Get clock events for a schedule
  forSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.clockEvent.findMany({
        where: { scheduleId: input.scheduleId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: 'asc' },
      })
    }),

  // Get total hours worked in a date range (for payroll)
  hoursReport: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      from: z.date(),
      to: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx

      // Cleaners can only see their own
      const userId =
        session.user.role === 'CLEANER' ? session.user.id : input.userId

      const events = await prisma.clockEvent.findMany({
        where: {
          ...(userId && { userId }),
          timestamp: { gte: input.from, lte: input.to },
        },
        orderBy: { timestamp: 'asc' },
        include: { user: true, schedule: { include: { client: true } } },
      })

      // Pair clock-in/out events and calculate hours
      const bySchedule = new Map<string, typeof events>()
      for (const e of events) {
        const list = bySchedule.get(e.scheduleId) ?? []
        list.push(e)
        bySchedule.set(e.scheduleId, list)
      }

      return Array.from(bySchedule.entries()).map(([scheduleId, evts]) => {
        const clockIn  = evts.find(e => e.type === 'CLOCK_IN')
        const clockOut = evts.find(e => e.type === 'CLOCK_OUT')
        const hours = clockIn && clockOut
          ? (clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / 3_600_000
          : null
        return {
          scheduleId,
          client: evts[0]?.schedule.client.name,
          clockIn:  clockIn?.timestamp,
          clockOut: clockOut?.timestamp,
          hours: hours ? Math.round(hours * 100) / 100 : null,
          user: evts[0]?.user,
        }
      })
    }),
})
