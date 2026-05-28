import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, managerProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { notionSyncQueue } from '@/server/queue/notion-queue'

export const clientRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.client.findMany({
        where: {
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.search && {
            name: { contains: input.search, mode: 'insensitive' },
          }),
        },
        orderBy: { name: 'asc' },
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        include: {
          locations: true,
          schedules: {
            orderBy: { date: 'desc' },
            take: 10,
            include: { assignments: { include: { user: true } } },
          },
        },
      })
      if (!client) throw new TRPCError({ code: 'NOT_FOUND' })
      return client
    }),

  create: managerProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.string().optional(),
      address: z.string(),
      city: z.string().optional(),
      province: z.string().default('QC'),
      postalCode: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      accessNotes: z.string().optional(),
      contactName: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional(),
      frequency: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.create({ data: input })
      await notionSyncQueue.add('write-client', { action: 'create', entity: 'client', data: client })
      return client
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      accessNotes: z.string().optional(),
      contactName: z.string().optional(),
      contactPhone: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const client = await ctx.prisma.client.update({ where: { id }, data })
      await notionSyncQueue.add('write-client', { action: 'update', entity: 'client', data: client })
      return client
    }),
})
