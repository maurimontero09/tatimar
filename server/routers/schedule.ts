import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, managerProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { notionSyncQueue } from '@/server/queue/notion-queue'

export const scheduleRouter = createTRPCRouter({
  // Get schedules for a date range
  list: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      userId: z.string().optional(), // filter by cleaner
      clientId: z.string().optional(),
      status: z.enum(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx

      // Cleaners can only see their own schedules
      const userId =
        session.user.role === 'CLEANER' ? session.user.id : input.userId

      return prisma.schedule.findMany({
        where: {
          date: { gte: input.from, lte: input.to },
          ...(userId && {
            assignments: { some: { userId } },
          }),
          ...(input.clientId && { clientId: input.clientId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          client: true,
          assignments: { include: { user: true } },
          clockEvents: { orderBy: { timestamp: 'asc' } },
          completionPhotos: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })
    }),

  // Get single schedule
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      const schedule = await prisma.schedule.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          location: true,
          assignments: { include: { user: true } },
          clockEvents: { orderBy: { timestamp: 'asc' } },
          completionPhotos: true,
        },
      })
      if (!schedule) throw new TRPCError({ code: 'NOT_FOUND' })

      // Cleaners can only view their own
      if (session.user.role === 'CLEANER') {
        const isAssigned = schedule.assignments.some(a => a.userId === session.user.id)
        if (!isAssigned) throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return schedule
    }),

  // Create schedule (manager+)
  create: managerProcedure
    .input(z.object({
      clientId: z.string(),
      locationId: z.string().optional(),
      date: z.date(),
      startTime: z.date(),
      maxHours: z.number().min(0.5).max(24),
      projectLeadId: z.string().optional(),
      assigneeIds: z.array(z.string()).min(1),
      servicesList: z.array(z.string()).default([]),
      instructions: z.string().optional(),
      accessNotes: z.string().optional(),
      notes: z.string().optional(),
      isRecurring: z.boolean().default(false),
      recurringRule: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { assigneeIds, ...scheduleData } = input

      const schedule = await prisma.schedule.create({
        data: {
          ...scheduleData,
          assignments: {
            create: assigneeIds.map(userId => ({ userId })),
          },
        },
        include: { client: true, assignments: { include: { user: true } } },
      })

      // Queue Notion write-back
      await notionSyncQueue.add('write-schedule', {
        action: 'create',
        entity: 'schedule',
        data: schedule,
      })

      return schedule
    }),

  // Update schedule
  update: managerProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED']).optional(),
      instructions: z.string().optional(),
      accessNotes: z.string().optional(),
      notes: z.string().optional(),
      maxHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { id, ...data } = input

      const schedule = await prisma.schedule.update({
        where: { id },
        data,
      })

      await notionSyncQueue.add('write-schedule', {
        action: 'update',
        entity: 'schedule',
        data: schedule,
      })

      return schedule
    }),

  // Upcoming PENDING schedules (for assign modal)
  upcoming: managerProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const from = new Date()
      const to   = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000)
      return ctx.prisma.schedule.findMany({
        where: { date: { gte: from, lte: to }, status: 'PENDING' },
        include: { client: true, assignments: { include: { user: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })
    }),

  // Add a cleaner to an existing schedule
  assign: managerProcedure
    .input(z.object({ scheduleId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.scheduleAssignment.findUnique({
        where: { scheduleId_userId: { scheduleId: input.scheduleId, userId: input.userId } },
      })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Already assigned to this job' })

      return ctx.prisma.scheduleAssignment.create({
        data: { scheduleId: input.scheduleId, userId: input.userId },
      })
    }),

  // Mark complete (cleaner)
  markComplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx

      const schedule = await prisma.schedule.findUnique({
        where: { id: input.id },
        include: { assignments: true },
      })
      if (!schedule) throw new TRPCError({ code: 'NOT_FOUND' })

      // Only assigned cleaner or manager+
      if (session.user.role === 'CLEANER') {
        const isAssigned = schedule.assignments.some(a => a.userId === session.user.id)
        if (!isAssigned) throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.schedule.update({
        where: { id: input.id },
        data: { status: 'COMPLETED' },
      })
    }),
})
