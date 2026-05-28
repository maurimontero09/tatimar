import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'

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

      // Create clock-in event and update schedule status
      const [event] = await prisma.$transaction([
        prisma.clockEvent.create({
          data: {
            userId: session.user.id,
            scheduleId: input.scheduleId,
            type: 'CLOCK_IN',
            lat: input.lat,
            lng: input.lng,
            accuracy: input.accuracy,
          },
        }),
        prisma.schedule.update({
          where: { id: input.scheduleId },
          data: { status: 'IN_PROGRESS' },
        }),
      ])

      return event
    }),

  clockOut: protectedProcedure
    .input(z.object({
      scheduleId: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      notes: z.string().optional(),
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

      return prisma.clockEvent.create({
        data: {
          userId: session.user.id,
          scheduleId: input.scheduleId,
          type: 'CLOCK_OUT',
          lat: input.lat,
          lng: input.lng,
          notes: input.notes,
        },
      })
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
