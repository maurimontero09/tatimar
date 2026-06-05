import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where:   { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: { userId: ctx.session.user.id, read: false },
    })
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id },
        data:  { read: true },
      })
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: { userId: ctx.session.user.id, read: false },
      data:  { read: true },
    })
  }),
})
